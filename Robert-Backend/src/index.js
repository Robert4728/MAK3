// src/index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.join(__dirname, "../config/config.env") });

console.log("🚀 STARTING SERVER...");
console.log("📁 Current directory:", __dirname);
console.log("🔧 Environment:", process.env.NODE_ENV || "development");
console.log("📤 APPWRITE ENDPOINT:", process.env.APPWRITE_ENDPOINT);

// ========== IMPORT CONTROLLERS ==========
console.log("📦 Importing controllers...");

let uploadController, orderController, authController;
try {
  // Dynamic imports to see which ones fail
  uploadController = await import("./controllers/uploadController.js");
  console.log("✅ Upload controller imported");
  
  orderController = await import("./controllers/orderController.js");
  console.log("✅ Order controller imported");
  
  authController = await import("./controllers/authController.js");
  console.log("✅ Auth controller imported");
} catch (error) {
  console.error("❌ FAILED TO IMPORT CONTROLLER:", error.message);
  console.error("❌ Check if files exist in src/controllers/");
  process.exit(1);
}

// ========== CREATE EXPRESS APP ==========
const app = express();

// ========== MIDDLEWARE ==========
// CORS configuration
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware - this handles both regular requests AND preflight
app.use(cors(corsOptions));

// Explicitly handle preflight for all routes - FIXED: Use regex instead of '*'
app.options(/.*/, (req, res) => {
  res.header("Access-Control-Allow-Origin", corsOptions.origin);
  res.header("Access-Control-Allow-Methods", corsOptions.methods.join(','));
  res.header("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(','));
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  
  // Safely check for body
  if (req.body) {
    if (typeof req.body === 'object' && req.body !== null) {
      const bodyKeys = Object.keys(req.body);
      console.log(`📦 Body keys:`, bodyKeys);
      if (bodyKeys.length > 0) {
        console.log(`📝 Body sample:`, JSON.stringify(req.body).substring(0, 500));
      }
    } else {
      console.log(`📦 Body type:`, typeof req.body, `- Value:`, req.body);
    }
  } else {
    console.log(`📦 No body`);
  }
  
  next();
});

// ========== MULTER CONFIGURATION ==========
console.log("🔧 Configuring multer...");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    console.log(`📁 File upload attempt:`, file.originalname);
    const isSTL = file.originalname.toLowerCase().endsWith('.stl');
    if (isSTL) {
      cb(null, true);
    } else {
      console.error(`❌ Invalid file type:`, file.originalname);
      cb(new Error('Only STL files are allowed'), false);
    }
  }
});

// ========== ROUTES ==========
console.log("🛣️  Setting up routes...");

// 1. Health check (always works)
app.get("/api/health", (req, res) => {
  console.log("❤️  Health check requested");
  res.json({ 
    success: true,
    status: "OK", 
    message: "Server is running with NEW controllers",
    timestamp: new Date().toISOString(),
    version: "2.0.0"
  });
});

// 2. DEBUG endpoint to see what controllers are loaded
app.get("/api/debug/controllers", (req, res) => {
  console.log("🔍 Debug controllers requested");
  res.json({
    success: true,
    controllers: {
      upload: uploadController ? "Loaded ✅" : "Missing ❌",
      order: orderController ? "Loaded ✅" : "Missing ❌",
      auth: authController ? "Loaded ✅" : "Missing ❌"
    },
    functions: {
      uploadSTLFiles: uploadController?.uploadSTLFiles ? "Exists ✅" : "Missing ❌",
      createOrder: orderController?.createOrder ? "Exists ✅" : "Missing ❌",
      checkEmail: authController?.checkEmail ? "Exists ✅" : "Missing ❌"
    }
  });
});

// 3. UPLOAD route - MUST use the imported controller
app.post("/api/upload/stl", upload.array('files', 10), (req, res, next) => {
  console.log("📤 UPLOAD ROUTE CALLED - Using NEW controller");
  console.log("📦 Files received:", req.files?.length || 0);
  console.log("📝 Body fields:", req.body);
  
  if (!uploadController?.uploadSTLFiles) {
    console.error("❌ UPLOAD CONTROLLER FUNCTION NOT FOUND!");
    return res.status(500).json({
      success: false,
      error: "Upload controller not loaded properly"
    });
  }
  
  return uploadController.uploadSTLFiles(req, res, next);
});

// 4. ORDER creation route - MUST use the imported controller
app.post("/api/orders", (req, res, next) => {
  console.log("📦 ORDER CREATION ROUTE CALLED - Using NEW controller");
  console.log("📝 Request body keys:", Object.keys(req.body));
  
  if (!orderController?.createOrder) {
    console.error("❌ ORDER CONTROLLER FUNCTION NOT FOUND!");
    return res.status(500).json({
      success: false,
      error: "Order controller not loaded properly"
    });
  }
  
  return orderController.createOrder(req, res, next);
});

// 5. Auth check email route
app.post("/api/auth/check-email", (req, res, next) => {
  console.log("📧 CHECK EMAIL ROUTE CALLED");
  
  if (!authController?.checkEmail) {
    console.error("❌ AUTH CONTROLLER FUNCTION NOT FOUND!");
    return res.status(500).json({
      success: false,
      error: "Auth controller not loaded properly"
    });
  }
  
  return authController.checkEmail(req, res, next);
});

// 6. Debug database
app.get("/api/debug/database", (req, res, next) => {
  console.log("🔍 DEBUG DATABASE ROUTE CALLED");
  
  if (!orderController?.debugDatabase) {
    console.error("❌ DEBUG FUNCTION NOT FOUND!");
    return res.status(500).json({
      success: false,
      error: "Debug function not loaded"
    });
  }
  
  return orderController.debugDatabase(req, res, next);
});

// ========== ROOT ENDPOINT ==========
app.get("/", (req, res) => {
  console.log("🌐 Root endpoint called");
  res.json({
    success: true,
    message: "3D Printing Order System Backend (V2 - WITH NEW CONTROLLERS)",
    status: "Running",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      // Test these first
      health: "GET    /api/health",
      debugControllers: "GET    /api/debug/controllers",
      debugDatabase: "GET    /api/debug/database",
      
      // Core endpoints
      uploadSTL: "POST   /api/upload/stl",
      createOrder: "POST   /api/orders",
      checkEmail: "POST   /api/auth/check-email",
      
      note: "Check server console for detailed logs on each request"
    }
  });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.message);
  console.error("📋 Error stack:", err.stack);
  
  if (err instanceof multer.MulterError) {
    console.error("📁 Multer error:", err.code);
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      "GET    /",
      "GET    /api/health",
      "GET    /api/debug/controllers",
      "GET    /api/debug/database",
      "POST   /api/upload/stl",
      "POST   /api/orders",
      "POST   /api/auth/check-email"
    ]
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ============================================
  🚀 3D Printing Order System Backend (V2)
  ============================================
  📍 Server: http://localhost:${PORT}
  🌐 Frontend: http://localhost:5173
  📅 Started: ${new Date().toLocaleString()}
  
  🔍 TEST THESE ENDPOINTS FIRST:
  --------------------------------------------
  1. Health:        GET  http://localhost:${PORT}/api/health
  2. Debug Controllers: GET  http://localhost:${PORT}/api/debug/controllers
  3. Debug Database: GET  http://localhost:${PORT}/api/debug/database
  
  📤 CORE ENDPOINTS:
  --------------------------------------------
  1. Upload STL:    POST http://localhost:${PORT}/api/upload/stl
  2. Create Order:  POST http://localhost:${PORT}/api/orders
  3. Check Email:   POST http://localhost:${PORT}/api/auth/check-email
  
  📋 LOGGING:
  --------------------------------------------
  • All requests will be logged to console
  • Check terminal for detailed debug info
  • Errors will show full stack traces
  
  ============================================
  `);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});

export default app;