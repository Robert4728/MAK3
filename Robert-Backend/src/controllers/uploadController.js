// controllers/uploadController.js
import appwrite from '../config/appwrite.js';
import { ID } from 'node-appwrite';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { config } from 'dotenv';

const { databases } = appwrite; // Only using databases from SDK

export const uploadSTLFiles = async (req, res) => {
  console.log("📤 ========== UPLOAD CONTROLLER STARTED ==========");
  
  try {
    // Debug: Log what we received
    console.log("📦 Request received");
    console.log("   Files count:", req.files?.length || 0);
    console.log("   Body:", req.body);
    
    // Check if files were uploaded
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      console.log("❌ No files found in request");
      return res.status(400).json({
        success: false,
        error: 'No files uploaded. Please select STL files to upload.'
      });
    }

    const files = req.files;
    const { 
      material = 'PLA',
      color = 'Black',
      scale = 100,
      quantity = 1,
      infill = 20,
      quality = 'Standard',
      shipping = 'Standard'
    } = req.body;

    // Parse numeric values
    const parsedScale = parseFloat(scale) || 100;
    const parsedQuantity = parseInt(quantity) || 1;
    const parsedInfill = parseInt(infill) || 20;
    
    console.log(`📤 Processing ${files.length} file(s)`);
    console.log("🛠️ Print Options:", {
      material, color, scale: parsedScale, quantity: parsedQuantity, 
      infill: parsedInfill, quality, shipping
    });

    // Configuration from environment variables
    const STORAGE_ID = process.env.APPWRITE_STORAGE_ID || 'templates';
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '690ca284001cca2edff9';
    const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || 'stls';

    // Validate required environment variables
    console.log("🔧 Checking Appwrite configuration...");
    console.log("   APPWRITE_ENDPOINT:", process.env.APPWRITE_ENDPOINT ? "✅ Set" : "❌ Missing");
    console.log("   APPWRITE_PROJECT_ID:", process.env.APPWRITE_PROJECT_ID ? "✅ Set" : "❌ Missing");
    console.log("   APPWRITE_API_KEY:", process.env.APPWRITE_API_KEY ? "✅ Set" : "❌ Missing");
    console.log("   STORAGE_ID:", STORAGE_ID);
    
    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      throw new Error('Missing Appwrite configuration. Check your .env file.');
    }

    const uploadedFiles = [];
    const storedFileIds = [];

    // Process each file
    for (const [index, file] of files.entries()) {
      console.log(`\n📁 Processing file ${index + 1}/${files.length}: ${file.originalname}`);
      
      try {
        // Validate file has data
        console.log("🔍 File details:");
        console.log("   Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
        console.log("   Buffer length:", file.buffer?.length || 0, "bytes");
        console.log("   MIME type:", file.mimetype);
        console.log("   Field name:", file.fieldname);
        
        if (!file.buffer || file.buffer.length === 0) {
          console.error("❌ File buffer is empty");
          continue;
        }

        // Validate file type
        if (!file.originalname.toLowerCase().endsWith('.stl')) {
          console.warn("⚠️ Skipping non-STL file");
          continue;
        }

        // Calculate price
        const filePriceInCents = calculateFilePrice(
          file.size,
          material,
          parsedScale,
          parsedQuantity,
          parsedInfill,
          quality,
          shipping
        );
        const filePriceInDollars = filePriceInCents / 100;
        console.log("💰 Price calculated: $" + filePriceInDollars.toFixed(2));

        // ====================
        // UPLOAD TO APPWRITE
        // ====================
        console.log("📤 Starting upload to Appwrite...");
        
        const fileId = ID.unique();
        console.log("   Generated File ID:", fileId);
        
        // Create FormData for HTTP request
        const formData = new FormData();
        formData.append('fileId', fileId);
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype || 'application/octet-stream'
        });
        formData.append('permissions', 'write','read','update');

        const uploadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files`;
        console.log("   Upload URL:", uploadUrl);

        // Make HTTP request to Appwrite
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
            ...formData.getHeaders()
          },
          body: formData
        });

        console.log("📥 HTTP Response Status:", uploadResponse.status, uploadResponse.statusText);
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("❌ Appwrite API Error:", errorText);
          throw new Error(`Appwrite upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadedFile = await uploadResponse.json();
        console.log("✅ Upload successful!");
        console.log("   Appwrite File ID:", uploadedFile.$id);
        console.log("   File Name:", uploadedFile.name);
        console.log("   File Size:", uploadedFile.sizeOriginal, "bytes");

        // Get file URL
        const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
        console.log("🔗 File URL:", fileUrl);

        // ====================
        // SAVE METADATA TO DATABASE
        // ====================
        console.log("💾 Saving metadata to database...");

        let metadataId = null;
        try {
          const metadataDoc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            {
              stl_id: uploadedFile.$id,  // This is the auto-generated ID from Appwrite storage
              material: material,
              color: color,
              scale: parsedScale,
              quantity: parsedQuantity,
              infill: parsedInfill,
              quality: quality,
              shipping: shipping,
              price: filePriceInCents,  // Price in cents (integer)
              stl_order: null,  // Will be filled later when order is created
              // $createdAt and $updatedAt are auto-generated by Appwrite
              // $id is auto-generated by Appwrite
            }
          );
          metadataId = metadataDoc.$id;
          console.log("✅ Metadata saved with ID:", metadataId);
          console.log("   stl_id (file ID):", uploadedFile.$id);
          console.log("   Price:", filePriceInCents, "cents");
        } catch (dbError) {
          console.error("❌ Database save error:", dbError.message);
          console.error("   File uploaded but metadata not saved");
        }

        // Prepare response for frontend
        uploadedFiles.push({
          file_id: uploadedFile.$id,
          metadata_id: metadataId,
          name: file.originalname,
          url: fileUrl,
          price: filePriceInDollars,
          size: file.size,
          size_mb: (file.size / 1024 / 1024).toFixed(2),
          printOptions: {
            material,
            color,
            scale: parsedScale / 100,
            quantity: parsedQuantity,
            infill: parsedInfill,
            quality,
            shipping,
            price: filePriceInDollars
          }
        });

        storedFileIds.push(uploadedFile.$id);

      } catch (fileError) {
        console.error(`❌ Failed to process "${file.originalname}":`, fileError.message);
        console.error("Stack:", fileError.stack);
        // Continue processing other files
      }
    }

    // Check if any files were successfully uploaded
    if (uploadedFiles.length === 0) {
      console.error("❌ No files were successfully uploaded");
      return res.status(500).json({
        success: false,
        error: 'Failed to upload any files. Please check: 1) File format (.stl), 2) File size (< 50MB), 3) Internet connection'
      });
    }

    // ====================
    // SUCCESS RESPONSE
    // ====================
    console.log(`\n🎉 SUCCESS! Uploaded ${uploadedFiles.length} file(s)`);
    console.log("📊 Files uploaded:", uploadedFiles.map(f => f.name));
    
    res.status(200).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
      file_ids: storedFileIds,
      total: uploadedFiles.reduce((sum, file) => sum + file.price, 0)
    });

  } catch (error) {
    console.error('🔥 UPLOAD CONTROLLER ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload files',
      details: error.message
    });
  }
};

// ====================
// HELPER FUNCTIONS
// ====================

// Price calculation function
function calculateFilePrice(fileSize, material, scale, quantity, infill, quality, shipping) {
  const basePrice = 10.00;
  const materialMultiplier = {
    'PLA': 1.0,
    'Nylon': 1.5,
    'Resin': 2.0,
    'ABS': 1.2,
    'PETG': 1.15
  };
  
  const scaleMultiplier = scale / 100;
  const qualityMultiplier = {
    'Standard': 1.0,
    'High': 1.5,
    'Ultra': 2.0
  };
  
  const infillMultiplier = infill / 20;
  const sizePrice = (fileSize / (1024 * 1024)) * 0.1;
  const shippingCost = shipping === 'Express' ? 15 : 5;
  
  const priceInDollars = (basePrice * 
    (materialMultiplier[material] || 1.0) * 
    scaleMultiplier * 
    (qualityMultiplier[quality] || 1.0) * 
    infillMultiplier + 
    sizePrice + 
    shippingCost) * quantity;
  
  // Convert to integer cents for database storage
  return Math.round(priceInDollars * 100);
}

// Update print options
export const updatePrintOptions = async (req, res) => {
  try {
    const { metadataId } = req.params;
    const printOptions = req.body;

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '690ca284001cca2edff9';
    const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || 'stls';

    if (!metadataId) {
      return res.status(400).json({
        success: false,
        error: 'metadataId is required'
      });
    }

    // Get current document
    const currentDoc = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_ID,
      metadataId
    );

    // Recalculate price
    const newPriceInCents = calculateFilePrice(
      currentDoc.file_size,
      printOptions.material || currentDoc.material,
      printOptions.scale || currentDoc.scale,
      printOptions.quantity || currentDoc.quantity,
      printOptions.infill || currentDoc.infill,
      printOptions.quality || currentDoc.quality,
      printOptions.shipping || currentDoc.shipping
    );

    // Update document
    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      metadataId,
      {
        material: printOptions.material || currentDoc.material,
        color: printOptions.color || currentDoc.color,
        scale: printOptions.scale || currentDoc.scale,
        quantity: printOptions.quantity || currentDoc.quantity,
        infill: printOptions.infill || currentDoc.infill,
        quality: printOptions.quality || currentDoc.quality,
        shipping: printOptions.shipping || currentDoc.shipping,
        price: newPriceInCents,
        updated_at: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      metadata: updatedDoc,
      price: newPriceInCents / 100
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update print options'
    });
  }
};

// Get STL info
export const getSTLInfo = async (req, res) => {
  try {
    const { stlId } = req.params;
    
    if (!stlId) {
      return res.status(400).json({
        success: false,
        error: 'stlId is required'
      });
    }
    
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '690ca284001cca2edff9';
    const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || 'stls';
    
    // Query by stl_id
    const documents = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [`stl_id=${stlId}`]
    );
    
    if (documents.total === 0) {
      return res.status(404).json({
        success: false,
        error: 'STL file not found'
      });
    }
    
    const document = documents.documents[0];
    
    res.json({
      success: true,
      stl: {
        id: document.stl_id,
        metadata_id: document.$id,
        name: document.file_name,
        price: document.price / 100,
        printOptions: {
          material: document.material,
          color: document.color,
          scale: document.scale / 100,
          quantity: document.quantity,
          infill: document.infill,
          quality: document.quality,
          shipping: document.shipping
        },
        upload_date: document.upload_date,
        status: document.status
      }
    });
    
  } catch (error) {
    console.error('❌ Get STL info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get STL info'
    });
  }
};

// Delete STL file
export const deleteSTL = async (req, res) => {
  try {
    const { stlId } = req.params;
    
    if (!stlId) {
      return res.status(400).json({
        success: false,
        error: 'stlId is required'
      });
    }
    
    const STORAGE_ID = process.env.APPWRITE_STORAGE_ID || 'templates';
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '690ca284001cca2edff9';
    const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || 'stls';
    
    try {
      // First, find the metadata document
      const documents = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [`stl_id=${stlId}`]
      );
      
      if (documents.total > 0) {
        // Delete metadata
        for (const doc of documents.documents) {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTION_ID,
            doc.$id
          );
          console.log(`🗑️ Deleted metadata: ${doc.$id}`);
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Could not delete metadata:', dbError.message);
    }
    
    // Delete file from storage using HTTP
    const deleteUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_ID}/files/${stlId}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY
      }
    });
    
    console.log(`🗑️ Deleted file from storage: ${stlId}`);
    
    res.json({
      success: true,
      message: 'STL file deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete STL file'
    });
  }
};