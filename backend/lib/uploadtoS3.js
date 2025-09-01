import { s3 } from "./aws_textract.js";

export async function uploadToS3(fileBuffer, fileName, mimeType) {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  try {
    console.log(`📤 Uploading to S3: ${fileName}`);
    const result = await s3.putObject(params).promise();
    const s3Uri = `s3://${process.env.AWS_BUCKET_NAME}/${fileName}`;
    console.log(`✅ S3 upload successful: ${s3Uri}`);
    return s3Uri;
  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

export async function deleteFromS3(fileName) {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
  };

  try {
    console.log(`🗑️ Deleting from S3: ${fileName}`);
    await s3.deleteObject(params).promise();
    console.log(`✅ S3 delete successful: ${fileName}`);
  } catch (error) {
    console.error('❌ S3 delete failed:', error);
    throw new Error(`S3 delete failed: ${error.message}`);
  }
}
