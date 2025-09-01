/**
 * Universal Date Parser Utility
 * Handles multiple date formats consistently across all OCR engines
 * Provides robust date extraction and normalization
 */

/**
 * Parse various date formats into a consistent ISO date string (YYYY-MM-DD)
 * @param {string} text - Text that may contain a date
 * @returns {string|null} - ISO date string (YYYY-MM-DD) or null if no valid date found
 */
export function extractDateFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  console.log('🔍 Extracting date from text:', text.substring(0, 100));

  // Enhanced date patterns covering global formats
  const datePatterns = [
    // US Format: MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
    {
      pattern: /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/g,
      type: 'US_FULL',
      parser: (match) => parseUSDate(match[1], match[2], match[3])
    },
    
    // European Format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    {
      pattern: /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/g,
      type: 'EU_FULL',
      parser: (match) => parseEuropeanDate(match[1], match[2], match[3])
    },
    
    // ISO Format: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    {
      pattern: /(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/g,
      type: 'ISO',
      parser: (match) => new Date(`${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`)
    },
    
    // 2-digit year: MM/DD/YY, DD/MM/YY, etc.
    {
      pattern: /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2})(?!\d)/g,
      type: 'SHORT_YEAR',
      parser: (match) => parseShortYear(match[1], match[2], match[3])
    },
    
    // Month names (English): Jan 15, 2024 | January 15, 2024
    {
      pattern: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.,\s]+(\d{1,2})[.,\s]+(\d{2,4})/gi,
      type: 'MONTH_NAME_SHORT',
      parser: (match) => parseMonthNameDate(match[1], match[2], match[3])
    },
    
    // Full month names: January 15, 2024 | 15 January 2024
    {
      pattern: /(January|February|March|April|May|June|July|August|September|October|November|December)[.,\s]+(\d{1,2})[.,\s]+(\d{2,4})/gi,
      type: 'MONTH_NAME_FULL',
      parser: (match) => parseMonthNameDate(match[1], match[2], match[3])
    },
    
    // Reverse month name: 15 January 2024
    {
      pattern: /(\d{1,2})[.,\s]+(January|February|March|April|May|June|July|August|September|October|November|December)[.,\s]+(\d{2,4})/gi,
      type: 'REVERSE_MONTH_NAME',
      parser: (match) => parseMonthNameDate(match[2], match[1], match[3])
    },
    
    // Compact format: YYYYMMDD
    {
      pattern: /(\d{4})(\d{2})(\d{2})(?!\d)/g,
      type: 'COMPACT',
      parser: (match) => new Date(`${match[1]}-${match[2]}-${match[3]}`)
    },
    
    // With time: MM/DD/YYYY HH:MM, DD/MM/YYYY HH:MM
    {
      pattern: /(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\s+\d{1,2}:\d{2}/g,
      type: 'WITH_TIME',
      parser: (match) => parseAmbiguousDate(match[1], match[2], match[3])
    },
    
    // Receipt specific patterns
    {
      pattern: /date[:\s]*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/gi,
      type: 'RECEIPT_DATE',
      parser: (match) => parseAmbiguousDate(match[1], match[2], match[3])
    },
    
    // Transaction patterns
    {
      pattern: /trans[action]*[:\s]*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/gi,
      type: 'TRANSACTION_DATE',
      parser: (match) => parseAmbiguousDate(match[1], match[2], match[3])
    }
  ];

  const foundDates = [];

  // Try each pattern
  for (const { pattern, type, parser } of datePatterns) {
    pattern.lastIndex = 0; // Reset regex
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      try {
        const parsedDate = parser(match);
        if (isValidDate(parsedDate)) {
          const confidence = calculateDateConfidence(match[0], type, text);
          foundDates.push({
            date: parsedDate,
            confidence,
            type,
            original: match[0],
            index: match.index
          });
          console.log(`📅 Found ${type} date: ${match[0]} → ${parsedDate.toISOString().split('T')[0]} (confidence: ${confidence})`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to parse ${type} date: ${match[0]} - ${error.message}`);
      }
    }
  }

  if (foundDates.length === 0) {
    console.log('❌ No valid dates found in text');
    return null;
  }

  // Sort by confidence and recency preference
  foundDates.sort((a, b) => {
    // Primary sort: confidence
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    // Secondary sort: prefer more recent dates (within reason)
    const now = new Date();
    const diffA = Math.abs(now.getTime() - a.date.getTime());
    const diffB = Math.abs(now.getTime() - b.date.getTime());
    return diffA - diffB;
  });

  const bestDate = foundDates[0];
  const isoDate = bestDate.date.toISOString().split('T')[0];
  
  console.log(`✅ Best date selected: ${bestDate.original} → ${isoDate} (${bestDate.type}, confidence: ${bestDate.confidence})`);
  
  return isoDate;
}

/**
 * Parse US format date (MM/DD/YYYY)
 */
function parseUSDate(month, day, year) {
  const m = parseInt(month);
  const d = parseInt(day);
  const y = normalizeYear(parseInt(year));
  
  if (m > 12 || d > 31) {
    throw new Error('Invalid US date format');
  }
  
  return new Date(y, m - 1, d);
}

/**
 * Parse European format date (DD/MM/YYYY)
 */
function parseEuropeanDate(day, month, year) {
  const d = parseInt(day);
  const m = parseInt(month);
  const y = normalizeYear(parseInt(year));
  
  if (m > 12 || d > 31) {
    throw new Error('Invalid European date format');
  }
  
  return new Date(y, m - 1, d);
}

/**
 * Parse dates with 2-digit years
 */
function parseShortYear(first, second, year) {
  const y = normalizeYear(parseInt(year));
  const num1 = parseInt(first);
  const num2 = parseInt(second);
  
  // Use same ambiguity resolution as parseAmbiguousDate
  return parseAmbiguousDate(first, second, y.toString());
}

/**
 * Parse ambiguous MM/DD vs DD/MM dates intelligently
 */
function parseAmbiguousDate(first, second, year) {
  const num1 = parseInt(first);
  const num2 = parseInt(second);
  const y = normalizeYear(parseInt(year));
  
  // If first number > 12, must be DD/MM format
  if (num1 > 12) {
    return new Date(y, num2 - 1, num1); // DD/MM/YYYY
  }
  
  // If second number > 12, must be MM/DD format
  if (num2 > 12) {
    return new Date(y, num1 - 1, num2); // MM/DD/YYYY
  }
  
  // Both numbers ≤ 12: ambiguous case
  // Try to determine based on context or use preference
  
  // Prefer MM/DD (US format) but validate both
  const usDate = new Date(y, num1 - 1, num2);
  const euDate = new Date(y, num2 - 1, num1);
  
  // If only one is valid, use it
  if (isValidDate(usDate) && !isValidDate(euDate)) {
    return usDate;
  }
  if (isValidDate(euDate) && !isValidDate(usDate)) {
    return euDate;
  }
  
  // Both valid or both invalid - prefer US format (most common)
  return usDate;
}

/**
 * Parse month name dates
 */
function parseMonthNameDate(monthStr, day, year) {
  const monthMap = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  
  const month = monthMap[monthStr.toLowerCase()];
  if (month === undefined) {
    throw new Error(`Unknown month: ${monthStr}`);
  }
  
  const d = parseInt(day);
  const y = normalizeYear(parseInt(year));
  
  return new Date(y, month, d);
}

/**
 * Normalize 2-digit years to 4-digit years
 */
function normalizeYear(year) {
  if (year >= 1900) {
    return year; // Already 4-digit
  }
  
  if (year <= 99) {
    // 2-digit year: 00-30 = 2000-2030, 31-99 = 1931-1999
    return year <= 30 ? 2000 + year : 1900 + year;
  }
  
  return year;
}

/**
 * Validate if a date is reasonable for a receipt
 */
function isValidDate(date) {
  if (!date || isNaN(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Receipt dates should be within reasonable range
  return date >= tenYearsAgo && date <= oneWeekFromNow;
}

/**
 * Calculate confidence score for a found date
 */
function calculateDateConfidence(dateString, type, fullText) {
  let confidence = 50; // Base confidence
  
  // Pattern-specific confidence adjustments
  switch (type) {
    case 'ISO':
      confidence += 30; // ISO format is unambiguous
      break;
    case 'MONTH_NAME_SHORT':
    case 'MONTH_NAME_FULL':
    case 'REVERSE_MONTH_NAME':
      confidence += 25; // Month names are clear
      break;
    case 'RECEIPT_DATE':
    case 'TRANSACTION_DATE':
      confidence += 20; // Context-specific patterns
      break;
    case 'COMPACT':
      confidence += 15; // Less common but unambiguous
      break;
    case 'WITH_TIME':
      confidence += 10; // Time context helps
      break;
    case 'US_FULL':
    case 'EU_FULL':
      confidence += 5; // Standard but potentially ambiguous
      break;
    case 'SHORT_YEAR':
      confidence -= 5; // 2-digit years are less reliable
      break;
  }
  
  // Context bonuses
  const lowerText = fullText.toLowerCase();
  
  if (lowerText.includes('date')) confidence += 10;
  if (lowerText.includes('transaction')) confidence += 8;
  if (lowerText.includes('receipt')) confidence += 8;
  if (lowerText.includes('purchase')) confidence += 5;
  
  // Format quality bonuses
  if (dateString.length >= 8) confidence += 5; // Longer dates are usually better
  if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(dateString)) confidence += 10; // Perfect ISO format
  
  return Math.min(100, Math.max(0, confidence));
}

/**
 * Format date consistently for storage
 */
export function formatDateForStorage(date) {
  if (!date) return null;
  
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isValidDate(parsed)) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }
  
  if (date instanceof Date && isValidDate(date)) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Get current date as fallback
 */
export function getCurrentDateFallback() {
  return new Date().toISOString().split('T')[0];
}

export default {
  extractDateFromText,
  formatDateForStorage,
  getCurrentDateFallback
};
