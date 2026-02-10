import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/database.js';

interface Order extends RowDataPacket {
  id: number;
  user_id: number;
  service_key: string;
  service_title: string;
  delivery_option: string;
  delivery_fee: number;
  total_amount: number;
  address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Create a new order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received order request:', req.body);

    const {
      userId,
      servicePackageKey,
      serviceTitle,
      deliveryOption,
      deliveryFee,
      address,
    } = req.body;

    // Validate required fields
    if (!userId || !servicePackageKey || !serviceTitle || !deliveryOption) {
      console.log('Validation failed:', { userId, servicePackageKey, serviceTitle, deliveryOption });
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    console.log('Validation passed, creating order...');

    // Calculate total amount (deliveryFee only)
    const fee = parseInt(deliveryFee.toString()) || 0;
    const totalAmount = fee;

    const connection = await pool.getConnection();
    try {
      // Insert order
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders (user_id, service_key, service_title, delivery_option, delivery_fee, total_amount, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, servicePackageKey, serviceTitle, deliveryOption, fee, totalAmount, address || null]
      );

      const orderId = result.insertId;
      console.log('Order inserted with ID:', orderId);

      // Log status change
      await connection.execute(
        `INSERT INTO order_status_history (order_id, status, notes)
         VALUES (?, 'pending', 'Order placed successfully, awaiting confirmation')`,
        [orderId]
      );

      // Fetch the created order
      const [orders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      connection.release();

      if (orders.length > 0) {
        console.log('Order created successfully:', orders[0]);
        res.status(201).json({
          success: true,
          message: 'Order created successfully',
          order: orders[0],
        });
      } else {
        console.log('Failed to retrieve created order');
        res.status(500).json({ error: 'Failed to retrieve created order' });
      }
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get all orders for a user
export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const connection = await pool.getConnection();
    try {
      const [orders] = await connection.execute<Order[]>(
        `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );

      connection.release();

      res.status(200).json({
        success: true,
        orders: orders,
        total: orders.length,
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' });
      return;
    }

    const connection = await pool.getConnection();
    try {
      const [orders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        connection.release();
        return;
      }

      // Get status history
      const [history] = await connection.execute<RowDataPacket[]>(
        'SELECT status, changed_at, notes FROM order_status_history WHERE order_id = ? ORDER BY changed_at DESC',
        [orderId]
      );

      connection.release();

      res.status(200).json({
        success: true,
        order: orders[0],
        statusHistory: history,
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!orderId || !status) {
      res.status(400).json({ error: 'Order ID and status are required' });
      return;
    }

    const validStatuses = [
      'accepted',
      'processing',
      'washing',
      'drying',
      'folding',
      'ironing',
      'packaging',
      'ready',
      'completed',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const connection = await pool.getConnection();
    try {
      // Check if order exists
      const [orders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        connection.release();
        return;
      }

      // Update order status
      await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, orderId]
      );

      // Log status change
      await connection.execute(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
        [orderId, status, notes || null]
      );

      // Fetch updated order
      const [updatedOrders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      connection.release();

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        order: updatedOrders[0],
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'Order ID is required' });
      return;
    }

    const connection = await pool.getConnection();
    try {
      // Check if order exists
      const [orders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        connection.release();
        return;
      }

      const currentOrder = orders[0];

      // Check if order can be cancelled (only if not completed or already cancelled)
      if (currentOrder.status === 'completed' || currentOrder.status === 'cancelled') {
        res.status(400).json({ error: `Cannot cancel order with status: ${currentOrder.status}` });
        connection.release();
        return;
      }

      // Update order status to cancelled
      await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['cancelled', orderId]
      );

      // Log cancellation
      await connection.execute(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES (?, ?, ?)',
        [orderId, 'cancelled', reason || 'Order cancelled by user']
      );

      // Fetch updated order
      const [updatedOrders] = await connection.execute<Order[]>(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );

      connection.release();

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        order: updatedOrders[0],
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
