// routes/orders.js
import express from 'express';
import { 
  createOrder, 
  getOrderWithDetails, 
  getCustomerOrders,
  getAllOrders,
  getSTLOptions,
  getOrdersByOrderId,
  updateOrderStatus
} from '../controllers/orderController.js';

const router = express.Router();

// Order routes
router.get('/', getAllOrders);  // GET all orders
router.get('/stl-options', getSTLOptions);  // GET STL options
router.get('/:id', getOrderWithDetails);  // GET specific order
router.get('/customer/:customerId', getCustomerOrders);  // GET customer orders
router.get('/by-order/:orderId', getOrdersByOrderId);  // GET orders by order ID
router.post('/', createOrder);  // POST create order
router.patch('/:id/status', updateOrderStatus);  // PATCH update status

export default router;