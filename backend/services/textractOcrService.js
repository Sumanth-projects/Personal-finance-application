import { textract } from "../lib/aws_textract.js";
import { uploadToS3, deleteFromS3 } from "../lib/uploadtoS3.js";
import { extractDateFromText, formatDateForStorage, getCurrentDateFallback } from "../utils/dateParser.js";

/**
 * AWS Textract OCR Service
 * Uses AWS Textract's AnalyzeExpense API for receipt processing
 * Implements temporary S3 storage (upload → process → delete)
 */
export async function processReceiptWithTextract(imageBuffer, fileName) {
  let s3Uri = null;
  
  try {
    console.log('🚀 Starting AWS Textract OCR processing...');
    
    // Step 1: Upload to S3 temporarily
    const mimeType = getImageMimeType(fileName);
    const s3FileName = `temp-receipts/${Date.now()}-${fileName}`;
    s3Uri = await uploadToS3(imageBuffer, s3FileName, mimeType);
    
    // Step 2: Process with Textract AnalyzeExpense
    const textractParams = {
      Document: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: s3FileName
        }
      }
    };
    
    console.log('📄 Analyzing receipt with AWS Textract AnalyzeExpense...');
    const textractResult = await textract.analyzeExpense(textractParams).promise();
    
    // Step 3: Extract structured data
    const extractedData = extractReceiptData(textractResult);
    console.log('✅ Textract analysis complete:', {
      confidence: extractedData.confidence,
      itemCount: extractedData.items.length,
      total: extractedData.total
    });
    
    return extractedData;
    
  } catch (error) {
    console.error('❌ AWS Textract processing failed:', error);
    throw new Error(`Textract OCR failed: ${error.message}`);
  } finally {
    // Step 4: Always cleanup S3 file
    if (s3Uri) {
      try {
        const s3FileName = s3Uri.split('/').pop();
        await deleteFromS3(`temp-receipts/${s3FileName}`);
      } catch (cleanupError) {
        console.error('⚠️ S3 cleanup failed:', cleanupError);
        // Don't throw - this is just cleanup
      }
    }
  }
}

/**
 * Extract structured data from Textract AnalyzeExpense response
 */
function extractReceiptData(textractResult) {
  const result = {
    vendor: '',
    date: '',
    total: 0,
    items: [],
    confidence: 0,
    rawText: '',
    engine: 'AWS Textract'
  };
  
  try {
    // Get expense documents
    const expenseDocuments = textractResult.ExpenseDocuments || [];
    
    if (expenseDocuments.length === 0) {
      console.log('⚠️ No expense documents found in Textract response');
      return result;
    }
    
    const expenseDoc = expenseDocuments[0];
    
    // Extract summary fields (vendor, date, total)
    const summaryFields = expenseDoc.SummaryFields || [];
    let confidenceSum = 0;
    let confidenceCount = 0;
    
    summaryFields.forEach(field => {
      const fieldType = field.Type?.Text || '';
      const fieldValue = field.ValueDetection?.Text || '';
      const confidence = field.ValueDetection?.Confidence || 0;
      
      confidenceSum += confidence;
      confidenceCount++;
      
      console.log(`📋 Summary field: ${fieldType} = ${fieldValue} (${confidence.toFixed(1)}%)`);
      
      switch (fieldType.toLowerCase()) {
        case 'vendor_name':
        case 'merchant_name':
          result.vendor = fieldValue;
          break;
        case 'invoice_receipt_date':
        case 'date':
          // Use the universal date parser for consistent formatting
          const parsedDate = extractDateFromText(fieldValue);
          result.date = parsedDate || fieldValue; // Fallback to original if parsing fails
          break;
        case 'total':
        case 'amount_paid':
          result.total = parseFloat(fieldValue.replace(/[^0-9.]/g, '')) || 0;
          break;
      }
    });
    
    // Extract line items
    const lineItemGroups = expenseDoc.LineItemGroups || [];
    lineItemGroups.forEach(group => {
      const lineItems = group.LineItems || [];
      
      lineItems.forEach(item => {
        const lineItemFields = item.LineItemExpenseFields || [];
        const lineItem = {
          description: '',
          quantity: 1,
          price: 0,
          total: 0
        };
        
        lineItemFields.forEach(field => {
          const fieldType = field.Type?.Text || '';
          const fieldValue = field.ValueDetection?.Text || '';
          const confidence = field.ValueDetection?.Confidence || 0;
          
          confidenceSum += confidence;
          confidenceCount++;
          
          switch (fieldType.toLowerCase()) {
            case 'item':
            case 'product_code':
              lineItem.description = fieldValue;
              break;
            case 'quantity':
              lineItem.quantity = parseFloat(fieldValue) || 1;
              break;
            case 'price':
            case 'unit_price':
              lineItem.price = parseFloat(fieldValue.replace(/[^0-9.]/g, '')) || 0;
              break;
            case 'expense_row':
            case 'line_item_total':
              lineItem.total = parseFloat(fieldValue.replace(/[^0-9.]/g, '')) || 0;
              break;
          }
        });
        
        if (lineItem.description || lineItem.price > 0) {
          result.items.push(lineItem);
        }
      });
    });
    
    // Calculate overall confidence
    result.confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;
    
    // Build raw text from all detected text
    const allBlocks = textractResult.Blocks || [];
    const textBlocks = allBlocks.filter(block => block.BlockType === 'LINE');
    result.rawText = textBlocks.map(block => block.Text).join('\n');
    
    console.log('📊 Textract extraction summary:', {
      vendor: result.vendor,
      date: result.date,
      total: result.total,
      itemCount: result.items.length,
      averageConfidence: result.confidence.toFixed(1) + '%'
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error extracting Textract data:', error);
    return result;
  }
}

/**
 * Determine MIME type from file extension
 */
function getImageMimeType(fileName) {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg'; // Default fallback
  }
}

/**
 * Generate transaction data from extracted receipt information
 */
function generateTransactionData(extractedData, userId, categoryId) {
  console.log('🏗️ Generating transaction data from Textract extraction...');
  
  // Calculate confidence score for review decision
  const needsReview = extractedData.confidence < 80 || 
                     !extractedData.vendor || 
                     !extractedData.total || 
                     extractedData.total === 0;
  
  const transactionData = {
    userId,
    type: 'expense',
    amount: extractedData.total || 0,
    description: extractedData.vendor || 'Receipt Purchase',
    categoryId,
    date: extractedData.date ? new Date(extractedData.date) : new Date(),
    receipt: {
      storeName: extractedData.vendor || '',
      date: formatDateForStorage(extractedData.date) || getCurrentDateFallback(),
      total: extractedData.total || 0,
      tax: 0, // Textract doesn't separate tax in basic response
      items: extractedData.items || [],
      rawText: extractedData.rawText || '',
      ocrEngine: 'AWS Textract',
      ocrConfidence: Math.round(extractedData.confidence || 0),
      needsReview,
      reviewReason: needsReview ? 
        (extractedData.confidence < 80 ? 'Low confidence score' : 'Missing required fields') : 
        null,
      filename: '', // Will be set by upload controller
      originalName: '',
      mimetype: '',
      size: 0,
      path: ''
    }
  };
  
  console.log('✅ Transaction data generated:', {
    amount: transactionData.amount,
    vendor: transactionData.receipt.storeName,
    itemCount: transactionData.receipt.items.length,
    needsReview: transactionData.receipt.needsReview
  });
  
  return transactionData;
}

export default {
  processReceiptWithTextract,
  generateTransactionData
};
