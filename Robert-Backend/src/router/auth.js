// routes/auth.js
import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// Auth routes
router.post('/check-email', authController.checkEmail);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/current', authController.getCurrentUser);
router.post('/logout', authController.logoutUser);

export default router;