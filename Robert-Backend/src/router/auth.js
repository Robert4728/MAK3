import express from "express"
const router = express.Router()

import authController from "../controllers/auth.controller.js"

router.get("/test", (req, res) => {
  res.send("AUTH ROUTER WORKING");
});
router.post("/register", authController.registerUser)
console.log("Auth router loaded");

export default router;