// controllers/checkoutUploadController.js
import { Storage, ID } from 'node-appwrite';
import { ErrorHandler } from "../utils/ErrorHandler.js";
import SuccessHandler from "../utils/SuccessHandler.js";
import appwrite from "../config/appwrite.js";

export class CheckoutUploadController {
  constructor() {
    this.storage = appwrite.storage;
    this.bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID || 'stl_files_bucket';
  }

  async uploadForCheckout(req, res, next) {
    try {
      console.log('📤 CHECKOUT UPLOAD - Starting file upload');
      
      if (!req.file) {
        throw new ErrorHandler('No file uploaded', 400);
      }

      // Validate file type
      if (!req.file.originalname.toLowerCase().endsWith('.stl')) {
        throw new ErrorHandler('Only .stl files are allowed', 400);
      }

      console.log('📤 CHECKOUT UPLOAD - File info:', {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Upload to Appwrite Storage
      const file = await this.storage.createFile(
        this.bucketId,
        ID.unique(),
        req.file.buffer || req.file.path
      );

      // Get file URL
      const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${this.bucketId}/files/${file.$id}/view`;

      console.log('✅ CHECKOUT UPLOAD - File uploaded successfully:', {
        fileId: file.$id,
        fileUrl: fileUrl,
        fileName: req.file.originalname
      });

      return SuccessHandler(
        'File uploaded successfully',
        201,
        res,
        {
          fileId: file.$id,
          fileUrl: fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size
        }
      );
    } catch (error) {
      console.error('❌ CHECKOUT UPLOAD - Failed:', error.message);
      console.error('❌ CHECKOUT UPLOAD - Full error:', error);
      next(error);
    }
  }
}

export default new CheckoutUploadController();