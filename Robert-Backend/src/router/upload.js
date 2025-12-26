// routes/stluploadRoutes.js
import express from 'express';
import multer from 'multer';
import { 
  uploadSTLFiles, 
  updatePrintOptions, 
  getSTLInfo, 
  deleteSTL 
} from '../controllers/uploadController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // max 10 files
  }
});

// Upload multiple STL files - apply multer middleware directly
router.post('/upload', upload.array('files', 10), uploadSTLFiles);

// Update print options for an existing STL
router.put('/:metadataId/options', updatePrintOptions);

// Get STL info
router.get('/:stlId/info', getSTLInfo);

// Delete STL file
router.delete('/:stlId', deleteSTL);

export default router;