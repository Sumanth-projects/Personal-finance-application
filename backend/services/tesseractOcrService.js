import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

class TesseractOCRService {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'];
    this.supportedPdfTypes = ['.pdf'];
    console.log('✅ Tesseract OCR Service initialized');
  }

  /**
   * Main method to process uploaded receipt files
   */
  async processReceipt(filePath, fileType) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      console.log('=== TESSERACT OCR SERVICE ===');
      console.log(`Processing file: ${filePath}`);
      console.log(`File type: ${extension}`);
      console.log(`File exists: ${await fs.access(filePath).then(() => true).catch(() => false)}`);
      
      if (this.supportedImageTypes.includes(extension)) {
        console.log('Processing as image file with Tesseract...');
        return await this.processImageReceipt(filePath);
      } else if (this.supportedPdfTypes.includes(extension)) {
        console.log('PDF processing with Tesseract temporarily disabled');
        throw new Error('PDF processing temporarily disabled. Please upload image receipts (JPG, PNG).');
      } else {
        console.log(`Unsupported file type: ${extension}`);
        throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      console.error('=== TESSERACT OCR PROCESSING ERROR ===');
      console.error('Error details:', error.message);
      throw new Error(`Failed to process receipt with Tesseract: ${error.message}`);
    }
  }

  /**
   * Process image receipts using Tesseract.js
   */
  async processImageReceipt(imagePath) {
    let processedImagePath = null;
    
    try {
      console.log('=== TESSERACT IMAGE PROCESSING ===');
      console.log(`Image path: ${imagePath}`);
      
      // Preprocess image for better OCR results
      processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR with Tesseract
      const { data: { text, confidence } } = await Tesseract.recognize(
        processedImagePath,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`Tesseract Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      console.log(`✅ Tesseract completed with confidence: ${confidence}%`);
      console.log('📄 Raw OCR Text length:', text.length);

      // Parse extracted text into structured data
      const parsedData = this.parseReceiptText(text);
      parsedData.ocrConfidence = confidence;
      parsedData.ocrEngine = 'tesseract';

      return parsedData;

    } catch (error) {
      console.error('=== TESSERACT OCR ERROR ===');
      console.error('Error details:', error.message);
      throw error;
    } finally {
      // Clean up processed image if it was created
      if (processedImagePath && processedImagePath !== imagePath) {
        try {
          await fs.unlink(processedImagePath);
        } catch (cleanupError) {
          console.error('Error cleaning up processed image:', cleanupError);
        }
      }
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  async preprocessImage(imagePath) {
    try {
      const processedPath = imagePath.replace(/\.[^/.]+$/, '_processed.png');
      
      await sharp(imagePath)
        .greyscale()
        .normalize()
        .sharpen()
        .resize({ width: 2000, withoutEnlargement: true })
        .png()
        .toFile(processedPath);
      
      console.log('Image preprocessed successfully');
      return processedPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Parse receipt text and extract structured data
   */
  parseReceiptText(text) {
    const result = {
      storeName: null,
      storeAddress: null,
      date: null,
      items: [],
      total: null,
      tax: null,
      subtotal: null,
      receiptNumber: null,
      rawText: text,
      confidence: 'medium'
    };

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from receipt');
    }

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log('Processing', lines.length, 'lines of text');

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';

      // Extract store name (usually in first few lines)
      if (!result.storeName && i < 5 && this.isStoreName(line)) {
        result.storeName = this.cleanStoreName(line);
        console.log('Store name found:', result.storeName);
      }

      // Extract date
      const dateMatch = this.extractDate(line);
      if (dateMatch && !result.date) {
        result.date = dateMatch;
        console.log('Date found:', result.date);
      }

      // Extract receipt number
      const receiptMatch = this.extractReceiptNumber(line);
      if (receiptMatch && !result.receiptNumber) {
        result.receiptNumber = receiptMatch;
      }

      // Extract total amount
      const totalMatch = this.extractTotal(line);
      if (totalMatch && (!result.total || this.isMoreLikelyTotal(line))) {
        result.total = totalMatch;
        console.log('Total found:', result.total);
      }

      // Extract tax
      const taxMatch = this.extractTax(line);
      if (taxMatch) {
        result.tax = taxMatch;
        console.log('Tax found:', result.tax);
      }

      // Extract subtotal
      const subtotalMatch = this.extractSubtotal(line);
      if (subtotalMatch) {
        result.subtotal = subtotalMatch;
      }

      // Extract line items
      const itemMatch = this.extractLineItem(line, nextLine);
      if (itemMatch) {
        result.items.push(itemMatch);
        console.log('Item found:', itemMatch);
      }
    }

    // Validate and clean up results
    this.validateParsedData(result);
    
    console.log('Parsing completed. Found:', {
      storeName: !!result.storeName,
      date: !!result.date,
      itemCount: result.items.length,
      total: result.total
    });

    return result;
  }

  /**
   * Check if line contains a store name
   */
  isStoreName(line) {
    const skipPatterns = [
      /\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}/, // dates
      /\$\d+\.\d{2}/, // prices
      /total|tax|subtotal|receipt/i,
      /^\d+$/, // pure numbers
      /phone|tel|address/i,
      /^[*\-=]+$/ // decorative lines
    ];

    for (const pattern of skipPatterns) {
      if (pattern.test(line)) return false;
    }

    return /[A-Za-z]{2,}/.test(line) && 
           line.length >= 3 && 
           line.length <= 50;
  }

  /**
   * Clean store name
   */
  cleanStoreName(line) {
    return line
      .replace(/[*\-=]{2,}/g, '')
      .replace(/^\W+|\W+$/g, '')
      .trim();
  }

  /**
   * Extract date from line using multiple patterns
   */
  extractDate(line) {
    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+\d{1,2}[,.\s]+\d{2,4}/i,
      /(\d{1,2}[.\s]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+\d{2,4})/i,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[,.\s]+\d{2,4}/i,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{8})/,
      /(\d{1,2}\.\d{1,2}\.\d{2,4})/,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+\d{1,2}:\d{2}/,
      /date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+\d{1,2}:\d{2}[:\d]*\s*(AM|PM)?/i
    ];

    console.log('Checking line for date:', line);

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let dateStr = match[1] || match[0];
        console.log('Found potential date string:', dateStr);
        
        let parsedDate = this.parseVariousDateFormats(dateStr);
        
        if (parsedDate) {
          const now = new Date();
          const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          
          if (parsedDate >= fiveYearsAgo && parsedDate <= tomorrow) {
            const isoDate = parsedDate.toISOString().split('T')[0];
            console.log('Valid date found:', isoDate);
            return isoDate;
          } else {
            console.log('Date out of valid range:', parsedDate);
          }
        }
      }
    }
    console.log('No valid date found in line');
    return null;
  }

  /**
   * Parse various date formats into a Date object
   */
  parseVariousDateFormats(dateStr) {
    dateStr = dateStr.trim().replace(/[^\w\s\/-:.,]/g, '');
    
    const parseAttempts = [
      () => new Date(dateStr),
      () => {
        const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
        if (parts) {
          let year = parseInt(parts[3]);
          year = year < 50 ? 2000 + year : 1900 + year;
          return new Date(`${parts[1]}/${parts[2]}/${year}`);
        }
        return null;
      },
      () => {
        if (/^\d{8}$/.test(dateStr)) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return new Date(`${year}-${month}-${day}`);
        }
        return null;
      },
      () => {
        const parts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (parts) {
          return new Date(`${parts[2]}/${parts[1]}/${parts[3]}`);
        }
        return null;
      },
      () => {
        const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
        if (parts) {
          const num1 = parseInt(parts[1]);
          const num2 = parseInt(parts[2]);
          
          if (num1 > 12) {
            return new Date(`${parts[2]}/${parts[1]}/${parts[3]}`);
          } else if (num2 > 12) {
            return new Date(`${parts[1]}/${parts[2]}/${parts[3]}`);
          } else {
            const usDate = new Date(`${parts[1]}/${parts[2]}/${parts[3]}`);
            if (!isNaN(usDate.getTime())) {
              return usDate;
            }
            return new Date(`${parts[2]}/${parts[1]}/${parts[3]}`);
          }
        }
        return null;
      }
    ];

    for (const attempt of parseAttempts) {
      try {
        const result = attempt();
        if (result && !isNaN(result.getTime())) {
          console.log('Successfully parsed date:', dateStr, '→', result.toISOString().split('T')[0]);
          return result;
        }
      } catch (error) {
        // Continue to next attempt
      }
    }
    
    console.log('Failed to parse date:', dateStr);
    return null;
  }

  /**
   * Extract receipt number
   */
  extractReceiptNumber(line) {
    const patterns = [
      /receipt[#:\s]*(\w+)/i,
      /ref[#:\s]*(\w+)/i,
      /transaction[#:\s]*(\w+)/i,
      /#(\w+)/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1].length >= 3) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Extract total amount
   */
  extractTotal(line) {
    const totalPatterns = [
      /total[:\s]*\$?(\d+\.\d{2})/i,
      /amount[:\s]*\$?(\d+\.\d{2})/i,
      /balance[:\s]*\$?(\d+\.\d{2})/i,
      /grand\s+total[:\s]*\$?(\d+\.\d{2})/i,
      /final[:\s]*\$?(\d+\.\d{2})/i
    ];

    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) {
          return amount;
        }
      }
    }
    return null;
  }

  /**
   * Check if this line is more likely to be the final total
   */
  isMoreLikelyTotal(line) {
    const strongTotalIndicators = [
      /total/i,
      /amount/i,
      /balance/i,
      /final/i
    ];
    
    return strongTotalIndicators.some(pattern => pattern.test(line));
  }

  /**
   * Extract tax amount
   */
  extractTax(line) {
    const taxPatterns = [
      /tax[:\s]*\$?(\d+\.\d{2})/i,
      /gst[:\s]*\$?(\d+\.\d{2})/i,
      /vat[:\s]*\$?(\d+\.\d{2})/i,
      /hst[:\s]*\$?(\d+\.\d{2})/i
    ];

    for (const pattern of taxPatterns) {
      const match = line.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  /**
   * Extract subtotal amount
   */
  extractSubtotal(line) {
    const subtotalPatterns = [
      /subtotal[:\s]*\$?(\d+\.\d{2})/i,
      /sub[:\s]*\$?(\d+\.\d{2})/i
    ];

    for (const pattern of subtotalPatterns) {
      const match = line.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  /**
   * Extract line items
   */
  extractLineItem(line, nextLine = '') {
    if (this.isNonItemLine(line)) {
      return null;
    }

    const itemPatterns = [
      /^(.+?)\s+\$?(\d+\.\d{2})$/,
      /^(\d+)\s+(.+?)\s+\$?(\d+\.\d{2})$/,
      /^(.+?)\s+@\s+\$?(\d+\.\d{2})\s*=?\s*\$?(\d+\.\d{2})$/,
      /^([A-Za-z].{2,30})$/
    ];

    for (let i = 0; i < itemPatterns.length; i++) {
      const pattern = itemPatterns[i];
      const match = line.match(pattern);
      
      if (match) {
        switch (i) {
          case 0:
            return {
              name: match[1].trim(),
              price: parseFloat(match[2]),
              quantity: 1
            };
          case 1:
            return {
              name: match[2].trim(),
              price: parseFloat(match[3]),
              quantity: parseInt(match[1])
            };
          case 2:
            return {
              name: match[1].trim(),
              unitPrice: parseFloat(match[2]),
              price: parseFloat(match[3]),
              quantity: Math.round(parseFloat(match[3]) / parseFloat(match[2]))
            };
          case 3:
            const priceMatch = nextLine.match(/^\$?(\d+\.\d{2})$/);
            if (priceMatch) {
              return {
                name: match[1].trim(),
                price: parseFloat(priceMatch[1]),
                quantity: 1
              };
            }
            break;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if line should be skipped for item extraction
   */
  isNonItemLine(line) {
    const skipPatterns = [
      /total|subtotal|tax|discount|change/i,
      /thank\s+you|welcome|visit/i,
      /^\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}/,
      /phone|address|receipt/i,
      /^[*\-=\s]+$/,
      /cash|credit|debit|card/i,
      /^cashier|server|store/i
    ];

    return skipPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Validate and clean parsed data
   */
  validateParsedData(result) {
    if (!result.date) {
      console.warn('No date found in receipt - flagging for review');
      result.date = new Date().toISOString().split('T')[0];
      result.needsReview = true;
      result.reviewReason = result.reviewReason ? 
        result.reviewReason + '; No date found in receipt' : 
        'No date found in receipt';
    }

    if (!result.storeName) {
      result.storeName = 'Unknown Store';
      result.needsReview = true;
      result.reviewReason = result.reviewReason ? 
        result.reviewReason + '; Store name not detected' : 
        'Store name not detected';
    }

    if (result.total && result.total > 0) {
      const itemsTotal = result.items.reduce((sum, item) => sum + (item.price || 0), 0);
      
      if (itemsTotal > 0 && Math.abs(itemsTotal - result.total) > result.total * 0.3) {
        result.needsReview = true;
        result.reviewReason = result.reviewReason ? 
          result.reviewReason + '; Items total does not match receipt total' : 
          'Items total does not match receipt total';
      }
    }

    result.items = this.removeDuplicateItems(result.items);
  }

  /**
   * Remove duplicate items
   */
  removeDuplicateItems(items) {
    const seen = new Map();
    return items.filter(item => {
      const key = `${item.name}_${item.price}`;
      if (seen.has(key)) {
        seen.get(key).quantity += (item.quantity || 1);
        return false;
      }
      seen.set(key, item);
      return true;
    });
  }

  /**
   * Generate transaction object from parsed receipt data
   */
  generateTransactionData(parsedData, userId, categoryId = null) {
    return {
      userId,
      type: 'expense',
      amount: parsedData.total || 0,
      description: `Purchase at ${parsedData.storeName}`,
      categoryId,
      date: new Date(parsedData.date),
      receipt: {
        filename: null,
        originalName: null,
        mimetype: null,
        size: null,
        path: null,
        uploadDate: new Date(),
        storeName: parsedData.storeName,
        storeAddress: parsedData.storeAddress,
        receiptNumber: parsedData.receiptNumber,
        items: parsedData.items,
        subtotal: parsedData.subtotal,
        tax: parsedData.tax,
        total: parsedData.total,
        rawText: parsedData.rawText,
        ocrEngine: parsedData.ocrEngine,
        ocrConfidence: parsedData.ocrConfidence,
        needsReview: parsedData.needsReview,
        reviewReason: parsedData.reviewReason
      }
    };
  }
}

export default new TesseractOCRService();
