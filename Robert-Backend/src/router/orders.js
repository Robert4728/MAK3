// routes/orders.js
import express from 'express';
import { 
  createOrder, 
  getOrderWithDetails, 
  getCustomerOrders 
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/:id', getOrderWithDetails);
router.get('/customer/:customerId', getCustomerOrders);

export default router;