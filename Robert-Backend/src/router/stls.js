// routes/stls.js
import express from 'express';
import { getSTLOptions } from '../controllers/orderController.js';

const router = express.Router();

router.get('/options', getSTLOptions);

export default router;