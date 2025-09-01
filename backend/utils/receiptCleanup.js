import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Ensure upload directories exist
export const ensureUploadDirectories = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const receiptsDir = path.join(uploadsDir, 'receipts');
  const tempReceiptsDir = path.join(uploadsDir, 'temp-receipts');
  
  // Create directories if they don't exist
  [uploadsDir, receiptsDir, tempReceiptsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${path.relative(path.join(__dirname, '..'), dir)}`);
    }
  });
  
  console.log('✅ Upload directories verified/created');
};

// @desc    Clean up temporary receipt files older than specified hours
// @param   maxAgeHours - Maximum age in hours before cleanup (default: 24 hours)
export const cleanupTempReceipts = (maxAgeHours = 24) => {
  const tempDir = path.join(__dirname, '..', 'uploads', 'temp-receipts');
  
  if (!fs.existsSync(tempDir)) {
    console.log('📋 Temp receipts directory does not exist, creating it...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Temp receipts directory created');
    return;
  }

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
  const now = Date.now();

  try {
    const files = fs.readdirSync(tempDir);
    let cleanedCount = 0;

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const fileAgeMs = now - stats.mtime.getTime();

      if (fileAgeMs > maxAgeMs) {
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
          console.log(`🗑️ Cleaned up temp receipt: ${file} (age: ${Math.round(fileAgeMs / (1000 * 60 * 60))} hours)`);
        } catch (deleteError) {
          console.error(`❌ Error deleting temp file ${file}:`, deleteError.message);
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} temporary receipt files`);
    } else {
      console.log('📋 No temporary receipts need cleanup');
    }

  } catch (error) {
    console.error('❌ Error during temp receipts cleanup:', error.message);
  }
};

// @desc    Schedule periodic cleanup of temporary receipts
// @param   intervalHours - How often to run cleanup (default: 6 hours)
// @param   maxAgeHours - Maximum age before cleanup (default: 24 hours)
export const scheduleReceiptCleanup = (intervalHours = 6, maxAgeHours = 24) => {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`🔄 Scheduling receipt cleanup every ${intervalHours} hours (max age: ${maxAgeHours} hours)`);
  
  // Run cleanup immediately
  cleanupTempReceipts(maxAgeHours);
  
  // Schedule periodic cleanup
  setInterval(() => {
    console.log('🔄 Running scheduled temp receipts cleanup...');
    cleanupTempReceipts(maxAgeHours);
  }, intervalMs);
};

// @desc    Get temporary receipts statistics
export const getTempReceiptsStats = () => {
  const tempDir = path.join(__dirname, '..', 'uploads', 'temp-receipts');
  
  if (!fs.existsSync(tempDir)) {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null
    };
  }

  try {
    const files = fs.readdirSync(tempDir);
    let totalSize = 0;
    let oldestTime = Date.now();
    let newestTime = 0;
    let oldestFile = null;
    let newestFile = null;

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      totalSize += stats.size;
      
      if (stats.mtime.getTime() < oldestTime) {
        oldestTime = stats.mtime.getTime();
        oldestFile = {
          name: file,
          age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)) // hours
        };
      }
      
      if (stats.mtime.getTime() > newestTime) {
        newestTime = stats.mtime.getTime();
        newestFile = {
          name: file,
          age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60)) // minutes
        };
      }
    });

    return {
      totalFiles: files.length,
      totalSize: Math.round(totalSize / (1024 * 1024) * 100) / 100, // MB
      oldestFile,
      newestFile
    };

  } catch (error) {
    console.error('Error getting temp receipts stats:', error.message);
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
      error: error.message
    };
  }
};
