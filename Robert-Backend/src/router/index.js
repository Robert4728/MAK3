import express from "express";
const router = express.Router();
import auth from "./auth.js";
import orders from "./orders.js";
import stlRoutes from './stls.js'; // Add this import
import templates from "./templates.js";

// Import appwrite for testing
import appwrite from "../config/appwrite.js";

// API routes
router.use("/auth", auth);
router.use("/orders", orders);
router.use('/stls', stlRoutes); // Add this line
router.use("/templates", templates);

// Health check endpoint
router.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "3D Printing API is running",
    timestamp: new Date().toISOString()
  });
});

// Appwrite connection test
router.get("/api/test-appwrite", async (req, res) => {
  try {
    console.log('Testing Appwrite connection...');
    console.log('Endpoint:', process.env.APPWRITE_ENDPOINT);
    console.log('Project ID:', process.env.APPWRITE_PROJECT_ID);
    
    // Test basic Appwrite connection
    const databases = await appwrite.databases.list();
    
    res.json({
      success: true,
      message: 'Appwrite connection successful',
      databasesCount: databases.databases.length
    });
  } catch (error) {
    console.error('Appwrite connection test FAILED:', error);
    res.status(500).json({
      success: false,
      message: 'Appwrite connection failed',
      error: error.message,
      endpoint: process.env.APPWRITE_ENDPOINT,
      projectId: process.env.APPWRITE_PROJECT_ID
    });
  }
});

// Simple test route
router.get("/test", (req, res) => {
  res.json({ message: "Main router working!" });
});

export default router;