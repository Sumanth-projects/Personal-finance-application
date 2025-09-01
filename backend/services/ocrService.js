import Tesseract from 'tesseract.js';
import vision from '@google-cloud/vision';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { config } from 'dotenv';

// Load environment variables if not already loaded
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  config();
}

class OCRService {
  constructor() {
    this.supportedImageTypes = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'];
    this.supportedPdfTypes = ['.pdf'];
    this.visionClient = null;
    
    // Initialize Google Vision client
    this.initializeGoogleVision();
  }

  /**
   * Initialize Google Vision client with proper error handling
   */
  initializeGoogleVision() {
    try {
      console.log('=== GOOGLE VISION INITIALIZATION ===');
      console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      // Check if credentials file exists
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log('Checking credentials file at:', credPath);
        
        // Use synchronous fs to check file existence during initialization
        import('fs').then(fs => {
          if (fs.existsSync(credPath)) {
            console.log('✅ Credentials file found');
          } else {
            console.log('❌ Credentials file not found at specified path');
          }
        });
      } else {
        console.log('❌ GOOGLE_APPLICATION_CREDENTIALS not set in environment');
      }
      
      this.visionClient = new vision.ImageAnnotatorClient();
      console.log('✅ Google Vision API initialized successfully');
    } catch (error) {
      console.error('❌ Google Vision API initialization failed:', error.message);
      console.error('Error details:', error);
      console.log('🔄 Will fall back to Tesseract.js for OCR processing');
      this.visionClient = null;
    }
  }

  /**
   * Main method to process uploaded receipt files
   */
  async processReceipt(filePath, fileType) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      console.log('=== OCR SERVICE DEBUG ===');
      console.log(`Processing file: ${filePath}`);
      console.log(`File type: ${extension}`);
      console.log(`Google Vision available: ${!!this.visionClient}`);
      console.log(`File exists: ${await fs.access(filePath).then(() => true).catch(() => false)}`);
      
      if (this.supportedImageTypes.includes(extension)) {
        console.log('Processing as image file...');
        return await this.processImageReceipt(filePath);
      } else if (this.supportedPdfTypes.includes(extension)) {
        console.log('PDF processing currently disabled');
        // For now, we'll convert PDF to image and then process
        // In a production environment, you might want to use a different PDF processing library
        throw new Error('PDF processing temporarily disabled. Please upload image receipts (JPG, PNG).');
      } else {
        console.log(`Unsupported file type: ${extension}`);
        throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      console.error('=== OCR PROCESSING ERROR ===');
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to process receipt: ${error.message}`);
    }
  }

  /**
   * Process image receipts using Google Vision API or Tesseract.js fallback
   */
  async processImageReceipt(imagePath) {
    try {
      console.log('=== IMAGE OCR PROCESSING ===');
      console.log(`Image path: ${imagePath}`);
      
      // Try Google Vision API first
      if (this.visionClient) {
        console.log('✅ Google Vision client available, attempting to use Google Vision API...');
        try {
          const result = await this.processWithGoogleVision(imagePath);
          console.log('✅ Google Vision processing completed successfully');
          return result;
        } catch (visionError) {
          console.error('❌ Google Vision processing failed:', visionError.message);
          console.log('🔄 Falling back to Tesseract.js...');
          return await this.processWithTesseract(imagePath);
        }
      } else {
        console.log('❌ Google Vision client not available, using Tesseract.js...');
        return await this.processWithTesseract(imagePath);
      }
    } catch (error) {
      console.error('=== IMAGE OCR ERROR ===');
      console.error('Error details:', error.message);
      throw error;
    }
  }

  /**
   * Process receipt using Google Vision API
   */
  async processWithGoogleVision(imagePath) {
    try {
      console.log('=== GOOGLE VISION API DEBUG ===');
      
      // Read the image file
      console.log('📖 Reading image file...');
      const imageBuffer = await fs.readFile(imagePath);
      console.log(`📊 Image file size: ${imageBuffer.length} bytes`);
      
      // Prepare the request for document text detection (best for receipts)
      const request = {
        image: {
          content: imageBuffer.toString('base64')
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
          { type: 'TEXT_DETECTION' }
        ]
      };

      console.log('🚀 Sending request to Google Vision API...');
      console.log(`📋 Request features: ${request.features.map(f => f.type).join(', ')}`);
      
      const startTime = Date.now();
      const [response] = await this.visionClient.annotateImage(request);
      const processingTime = Date.now() - startTime;
      
      console.log(`⏱️ Google Vision API response time: ${processingTime}ms`);
      
      if (response.error) {
        console.error('❌ Google Vision API returned error:', response.error);
        throw new Error(`Google Vision API error: ${response.error.message}`);
      }

      // Extract text and structure
      const fullTextAnnotation = response.fullTextAnnotation;
      const textAnnotations = response.textAnnotations;
      
      console.log('📝 Checking response data...');
      console.log(`Full text available: ${!!fullTextAnnotation?.text}`);
      console.log(`Text annotations count: ${textAnnotations?.length || 0}`);
      
      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        console.warn('⚠️ No text detected in the image');
        throw new Error('No text detected in the image');
      }

      const extractedText = fullTextAnnotation.text;
      const confidence = this.calculateGoogleVisionConfidence(textAnnotations);
      
      console.log(`📊 Extracted text length: ${extractedText.length} characters`);
      console.log(`🎯 Overall confidence: ${confidence}%`);
      console.log('📄 First 200 chars of extracted text:');
      console.log(extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''));

      // Parse the extracted text
      console.log('🔍 Starting text parsing...');
      const parsedData = this.parseReceiptText(extractedText);
      parsedData.ocrConfidence = confidence;
      parsedData.ocrEngine = 'google-vision';
      parsedData.textBlocks = this.extractTextBlocks(fullTextAnnotation);

      console.log('✅ Google Vision processing completed successfully');
      console.log(`📋 Parsed data summary: Store: ${parsedData.storeName}, Date: ${parsedData.date}, Total: ${parsedData.total}, Items: ${parsedData.items?.length || 0}`);

      return parsedData;
      
    } catch (error) {
      console.error('=== GOOGLE VISION ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.details) console.error('Error details:', error.details);
      throw new Error(`Google Vision failed: ${error.message}`);
    }
  }

  /**
   * Calculate confidence score from Google Vision response
   */
  calculateGoogleVisionConfidence(textAnnotations) {
    if (!textAnnotations || textAnnotations.length === 0) return 0;
    
    // Skip the first annotation (full text) and calculate average confidence
    const confidences = textAnnotations
      .slice(1)
      .map(annotation => annotation.confidence || 0.9) // Default high confidence if not provided
      .filter(conf => conf > 0);
    
    if (confidences.length === 0) return 85; // Default reasonable confidence
    
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    return Math.round(avgConfidence * 100);
  }

  /**
   * Extract structured text blocks from Google Vision response
   */
  extractTextBlocks(fullTextAnnotation) {
    if (!fullTextAnnotation.pages || !fullTextAnnotation.pages[0]) return [];
    
    const blocks = [];
    const page = fullTextAnnotation.pages[0];
    
    if (page.blocks) {
      page.blocks.forEach(block => {
        const blockText = block.paragraphs
          ?.map(para => para.words
            ?.map(word => word.symbols
              ?.map(symbol => symbol.text || '')
              .join('')
            ).join(' ')
          ).join(' ') || '';
        
        if (blockText.trim()) {
          blocks.push({
            text: blockText.trim(),
            confidence: block.confidence || 0.9,
            boundingBox: block.boundingBox
          });
        }
      });
    }
    
    return blocks;
  }

  /**
   * Process receipt using Tesseract.js (fallback)
   */
  async processWithTesseract(imagePath) {
    let processedImagePath = null;
    
    try {
      console.log('Starting Tesseract OCR processing...');
      
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

      console.log(`Tesseract completed with confidence: ${confidence}%`);
      console.log('Raw OCR Text:', text);

      // Parse extracted text into structured data
      const parsedData = this.parseReceiptText(text);
      parsedData.ocrConfidence = confidence;
      parsedData.ocrEngine = 'tesseract';

      return parsedData;

    } catch (error) {
      console.error('Tesseract OCR Error:', error);
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
    // Skip if line contains common non-store indicators
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

    // Must contain letters and be reasonable length
    return /[A-Za-z]{2,}/.test(line) && 
           line.length >= 3 && 
           line.length <= 50;
  }

  /**
   * Clean store name
   */
  cleanStoreName(line) {
    return line
      .replace(/[*\-=]{2,}/g, '') // Remove decorative characters
      .replace(/^\W+|\W+$/g, '') // Remove leading/trailing non-word chars
      .trim();
  }

  /**
   * Extract date from line using multiple patterns
   */
  extractDate(line) {
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      // DD/MM/YYYY or DD-MM-YYYY  
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      // MM/DD/YY or MM-DD-YY (2-digit year)
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2})/,
      // Month DD, YYYY
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+\d{1,2}[,.\s]+\d{2,4}/i,
      // DD Month YYYY
      /(\d{1,2}[.\s]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+\d{2,4})/i,
      // Full month names
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[,.\s]+\d{2,4}/i,
      // YYYY-MM-DD (ISO format)
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      // YYYYMMDD (compact format)
      /(\d{8})/,
      // DD.MM.YYYY (European format)
      /(\d{1,2}\.\d{1,2}\.\d{2,4})/,
      // Time stamps that include dates
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+\d{1,2}:\d{2}/,
      // Receipt specific patterns
      /date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+\d{1,2}:\d{2}[:\d]*\s*(AM|PM)?/i
    ];

    console.log('Checking line for date:', line);

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let dateStr = match[1] || match[0];
        console.log('Found potential date string:', dateStr);
        
        // Handle different date formats
        let parsedDate = this.parseVariousDateFormats(dateStr);
        
        if (parsedDate) {
          // Validate date is reasonable (allow up to 5 years ago, and up to 1 day in future for timezone issues)
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
    // Clean the date string
    dateStr = dateStr.trim().replace(/[^\w\s\/-:.,]/g, '');
    
    // Try different parsing approaches
    const parseAttempts = [
      // Direct parsing
      () => new Date(dateStr),
      
      // Handle 2-digit years (assume 21st century)
      () => {
        const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
        if (parts) {
          let year = parseInt(parts[3]);
          year = year < 50 ? 2000 + year : 1900 + year; // 00-49 = 2000-2049, 50-99 = 1950-1999
          return new Date(`${parts[1]}/${parts[2]}/${year}`);
        }
        return null;
      },
      
      // Handle YYYYMMDD format
      () => {
        if (/^\d{8}$/.test(dateStr)) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return new Date(`${year}-${month}-${day}`);
        }
        return null;
      },
      
      // Handle DD.MM.YYYY format
      () => {
        const parts = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
        if (parts) {
          return new Date(`${parts[2]}/${parts[1]}/${parts[3]}`);
        }
        return null;
      },
      
      // Handle DD/MM/YYYY vs MM/DD/YYYY ambiguity
      () => {
        const parts = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
        if (parts) {
          const num1 = parseInt(parts[1]);
          const num2 = parseInt(parts[2]);
          
          // If first number > 12, it must be DD/MM/YYYY
          if (num1 > 12) {
            return new Date(`${parts[2]}/${parts[1]}/${parts[3]}`);
          }
          // If second number > 12, it must be MM/DD/YYYY
          else if (num2 > 12) {
            return new Date(`${parts[1]}/${parts[2]}/${parts[3]}`);
          }
          // Try both formats, prefer MM/DD/YYYY (US format)
          else {
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
   * Extract total amount with multiple patterns
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
        if (amount > 0 && amount < 10000) { // Reasonable total range
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
   * Extract line items (products/services)
   */
  extractLineItem(line, nextLine = '') {
    // Skip obvious non-items
    if (this.isNonItemLine(line)) {
      return null;
    }

    const itemPatterns = [
      // Item name followed by price on same line
      /^(.+?)\s+\$?(\d+\.\d{2})$/,
      // Quantity + Item + Price
      /^(\d+)\s+(.+?)\s+\$?(\d+\.\d{2})$/,
      // Item @ Unit Price = Total
      /^(.+?)\s+@\s+\$?(\d+\.\d{2})\s*=?\s*\$?(\d+\.\d{2})$/,
      // Just item name (price might be on next line)
      /^([A-Za-z].{2,30})$/
    ];

    for (let i = 0; i < itemPatterns.length; i++) {
      const pattern = itemPatterns[i];
      const match = line.match(pattern);
      
      if (match) {
        switch (i) {
          case 0: // Item + Price
            return {
              name: match[1].trim(),
              price: parseFloat(match[2]),
              quantity: 1
            };
          
          case 1: // Quantity + Item + Price
            return {
              name: match[2].trim(),
              price: parseFloat(match[3]),
              quantity: parseInt(match[1])
            };
          
          case 2: // Item @ Unit Price = Total
            return {
              name: match[1].trim(),
              unitPrice: parseFloat(match[2]),
              price: parseFloat(match[3]),
              quantity: Math.round(parseFloat(match[3]) / parseFloat(match[2]))
            };
          
          case 3: // Just item name
            // Check if next line has a price
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
      /^\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}/, // dates
      /phone|address|receipt/i,
      /^[*\-=\s]+$/, // decorative lines
      /cash|credit|debit|card/i,
      /^cashier|server|store/i
    ];

    return skipPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Validate and clean parsed data
   */
  validateParsedData(result) {
    // Only set default date if none found AND flag for manual review
    if (!result.date) {
      console.warn('No date found in receipt - flagging for review');
      result.date = new Date().toISOString().split('T')[0]; // Temporary fallback
      result.needsReview = true;
      result.reviewReason = result.reviewReason ? 
        result.reviewReason + '; No date found in receipt' : 
        'No date found in receipt';
    }

    // Set default store name if none found
    if (!result.storeName) {
      result.storeName = 'Unknown Store';
      result.needsReview = true;
      result.reviewReason = result.reviewReason ? 
        result.reviewReason + '; Store name not detected' : 
        'Store name not detected';
    }

    // Ensure total is reasonable
    if (result.total && result.total > 0) {
      // Calculate items total for validation
      const itemsTotal = result.items.reduce((sum, item) => sum + (item.price || 0), 0);
      
      // If items total is significantly different from stated total, flag for review
      if (itemsTotal > 0 && Math.abs(itemsTotal - result.total) > result.total * 0.3) {
        result.needsReview = true;
        result.reviewReason = 'Items total does not match receipt total';
      }
    }

    // Remove duplicate items
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
        // If duplicate, combine quantities
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
        filename: null, // Will be set by the controller
        originalName: null, // Will be set by the controller
        mimetype: null, // Will be set by the controller
        size: null, // Will be set by the controller
        path: null, // Will be set by the controller
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

export default new OCRService();
