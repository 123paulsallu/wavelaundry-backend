import { Router } from 'express';
import {
    cancelOrder,
    createOrder,
    getOrderById,
    getUserOrders,
    updateOrderStatus,
} from '../controllers/orderController.js';

const router = Router();

// Create a new order
router.post('/', createOrder);

// Get all orders for a user
router.get('/user/:userId', getUserOrders);

// Get order by ID
router.get('/:orderId', getOrderById);

// Update order status
router.patch('/:orderId/status', updateOrderStatus);

// Cancel order
router.delete('/:orderId', cancelOrder);

export default router;
