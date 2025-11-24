import db from "../config/db.js";
import appwrite from "../config/appwrite.js";
import { ID } from "node-appwrite";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import SuccessHandler from "../utils/SuccessHandler.js";

class STLController {
  async uploadSTL(req, res, next) {
    try {
      if (!req.user) {
        throw new ErrorHandler('Authentication required to upload files', 401);
      }

      const { name, description, tags, isPublic = true } = req.body;
      const file = req.file;

      if (!file) {
        throw new ErrorHandler('No file uploaded', 400);
      }

      if (!file.originalname.toLowerCase().endsWith('.stl')) {
        throw new ErrorHandler('Only STL files are allowed', 400);
      }

      // Upload to Appwrite Storage
      const uploadedFile = await appwrite.storage.createFile(
        'stl_files_bucket',
        ID.unique(),
        file.buffer
      );

      // Save to STLS collection
      const stlDocument = await db.STLS.create({
        name: name,
        description: description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        fileId: uploadedFile.$id,
        fileName: uploadedFile.name,
        fileSize: file.size,
        uploadedBy: req.user.$id,
        uploadDate: new Date().toISOString(),
        downloadCount: 0,
        isPublic: isPublic
      });

      return SuccessHandler(
        'STL file uploaded successfully', 
        201, 
        res, 
        { 
          file: stlDocument 
        }
      );
    } catch (error) {
      next(error);
    }
  }

  async getSTLFiles(req, res, next) {
    try {
      const { search = '', tag = '' } = req.query;
      
      let queries = ['isPublic=true'];
      
      const files = await db.STLS.list(queries);

      // Manual filtering for search and tags
      let filteredFiles = files.documents; // Changed from rows to documents
      
      if (search) {
        filteredFiles = filteredFiles.filter(file => 
          file.name?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (tag) {
        filteredFiles = filteredFiles.filter(file => 
          file.tags?.includes(tag)
        );
      }

      return SuccessHandler(
        'Files fetched successfully', 
        200, 
        res, 
        {
          files: filteredFiles,
          total: filteredFiles.length
        }
      );
    } catch (error) {
      console.error('STL files error:', error);
      next(new ErrorHandler('Error fetching files', 500));
    }
  }

  async getSTLFileById(req, res, next) {
    try {
      const { id } = req.params;
      
      const file = await db.STLS.get(id);

      if (!file.isPublic && (!req.user || file.uploadedBy !== req.user.$id)) {
        throw new ErrorHandler('Access denied', 403);
      }

      return SuccessHandler(
        'File fetched successfully', 
        200, 
        res, 
        {
          file: file
        }
      );
    } catch (error) {
      next(new ErrorHandler('File not found', 404));
    }
  }

  async downloadSTL(req, res, next) {
    try {
      const { id } = req.params;
      
      const file = await db.STLS.get(id);

      if (!file.isPublic && (!req.user || file.uploadedBy !== req.user.$id)) {
        throw new ErrorHandler('Access denied', 403);
      }

      // Increment download count
      await db.STLS.update(file.$id, {
        downloadCount: (file.downloadCount || 0) + 1
      });

      return SuccessHandler(
        'Download prepared successfully', 
        200, 
        res, 
        {
          file: file,
          downloadUrl: `/api/stls/${id}/file`
        }
      );
    } catch (error) {
      next(new ErrorHandler('File not found', 404));
    }
  }
}

export default new STLController();