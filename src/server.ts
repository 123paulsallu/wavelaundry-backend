import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { addMissingColumns } from './migrations/addMissingColumns.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database tables on startup
const initializeTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        profile_picture_url VARCHAR(500),
        push_token VARCHAR(500),
        dark_mode BOOLEAN DEFAULT FALSE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);

    // Create delivery addresses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS delivery_addresses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        address VARCHAR(500) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      )
    `);
    
    // Create orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        service_title VARCHAR(255) NOT NULL,
        delivery_option ENUM('pickup', 'express', 'none') NOT NULL,
        delivery_fee INT DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        address TEXT,
        status ENUM('pending', 'accepted', 'processing', 'washing', 'drying', 'folding', 'ironing', 'packaging', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // Create notifications table (log)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSON,
        target_user_id INT,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create order status history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id)
      )
    `);
    
    connection.release();
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
};

// Initialize tables and add missing columns on startup
(async () => {
  try {
    await initializeTables();
    await addMissingColumns();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
})();

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Database connection test
app.get('/api/db-test', async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 as test');
    connection.release();

    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'NOT_FOUND',
    message: 'Route not found',
    path: req.path,
  });
});

// Error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'ERROR',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`📱 User connected: ${socket.id}`);

  // User joins their personal room
  socket.on('join-user', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`✅ User ${userId} joined personal room`);
  });

  // User joins general broadcast room
  socket.on('join-broadcast', () => {
    socket.join('broadcast');
    console.log(`📢 User ${socket.id} joined broadcast room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.locals.io = io;

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 WebSocket (Socket.io) enabled on ws://localhost:${PORT}`);
});
