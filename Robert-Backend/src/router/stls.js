// backend/routes/stluploadRoutes.js
const express = require('express');
const multer = require('multer');
const {
  uploadSTLFiles,
  updatePrintOptions,
  getSTLInfo,
  deleteSTL
} = require('../controllers/stluploadController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for Appwrite
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per file
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Accept STL files
    const allowedTypes = [
      'application/sla',
      'application/vnd.ms-pki.stl',
      'model/stl',
      'application/octet-stream'
    ];
    
    const isSTL = allowedTypes.includes(file.mimetype) || 
                  file.originalname.toLowerCase().endsWith('.stl');
    
    if (isSTL) {
      cb(null, true);
    } else {
      cb(new Error('Only STL files are allowed'), false);
    }
  }
});

// Upload multiple STL files
router.post('/upload', upload.array('files', 10), uploadSTLFiles);

// Update print options
router.put('/:metadataId/options', updatePrintOptions);

// Get STL info
router.get('/:stlId/info', getSTLInfo);

// Delete STL file
router.delete('/:stlId', deleteSTL);

module.exports = router;