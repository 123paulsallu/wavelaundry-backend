import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import pool from '../config/database.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'All fields are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Password must be at least 6 characters',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();

    // Check if email or phone already exists
    const [existingUser] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone]
    );

    if ((existingUser as any[]).length > 0) {
      connection.release();
      return res.status(409).json({
        status: 'CONFLICT',
        message: 'Email or phone number already registered',
      });
    }

    // Insert user
    const [result] = await connection.query(
      'INSERT INTO users (name, email, phone, password, created_at) VALUES (?, ?, ?, ?, NOW())',
      [name, email, phone, hashedPassword]
    );
    connection.release();

    res.status(201).json({
      status: 'CREATED',
      message: 'User registered successfully',
      data: {
        id: (result as any).insertId,
        name,
        email,
        phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Registration failed',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Phone number and password are required',
      });
    }

    const connection = await pool.getConnection();

    // Find user by phone
    const [users] = await connection.query('SELECT * FROM users WHERE phone = ? LIMIT 1', [
      phone,
    ]);
    connection.release();

    const userArray = users as any[];
    if (userArray.length === 0) {
      return res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'Invalid phone number or password',
      });
    }

    const user = userArray[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'Invalid phone number or password',
      });
    }

    // Return user data (without password)
    res.status(200).json({
      status: 'SUCCESS',
      message: 'Login successful',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Login failed',
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, phone, created_at FROM users LIMIT 100');
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      data: rows,
      count: (rows as any[]).length,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT id, name, email, phone, created_at FROM users WHERE id = ?', [id]);
    connection.release();

    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: rowsArray[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const connection = await pool.getConnection();
    await connection.query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [
      name,
      email,
      phone,
      id,
    ]);
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'User updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    await connection.query('DELETE FROM users WHERE id = ?', [id]);
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Email is required',
      });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [users] = await connection.query('SELECT id, email FROM users WHERE email = ?', [
      email,
    ]);
    const userArray = users as any[];

    if (userArray.length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Email not found',
      });
    }

    // Generate reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await connection.query(
      'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE email = ?',
      [resetToken, expiresAt, email]
    );
    connection.release();

    // In production, send email with reset link
    // For now, log the token (in real app, send via email service)
    console.log(`Reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to process password reset request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    // Validation
    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Passwords do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Password must be at least 6 characters',
      });
    }

    const connection = await pool.getConnection();

    // Find user with valid reset token
    const [users] = await connection.query(
      'SELECT id, email FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW()',
      [resetToken]
    );
    const userArray = users as any[];

    if (userArray.length === 0) {
      connection.release();
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await connection.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
      [hashedPassword, userArray[0].id]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Password reset successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to reset password',
    });
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID is required',
      });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT id, name, email, phone, profile_picture_url, dark_mode, notifications_enabled FROM users WHERE id = ?',
      [userId]
    );
    connection.release();

    if ((users as any[]).length === 0) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: (users as any[])[0],
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get user profile',
    });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, profile_picture_url } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID is required',
      });
    }

    const connection = await pool.getConnection();
    
    // Check if email is already taken by another user
    if (email) {
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if ((existing as any[]).length > 0) {
        connection.release();
        return res.status(409).json({
          status: 'CONFLICT',
          message: 'Email already in use',
        });
      }
    }

    await connection.query(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), profile_picture_url = COALESCE(?, profile_picture_url), updated_at = NOW() WHERE id = ?',
      [name || null, email || null, phone || null, profile_picture_url || null, userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Profile updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to update profile',
    });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'New passwords do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Password must be at least 6 characters',
      });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if ((users as any[]).length === 0) {
      connection.release();
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, (users as any[])[0].password_hash);
    if (!passwordMatch) {
      connection.release();
      return res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'Old password is incorrect',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to change password',
    });
  }
};

// Get delivery addresses
export const getDeliveryAddresses = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID is required',
      });
    }

    const connection = await pool.getConnection();
    const [addresses] = await connection.query(
      'SELECT id, address, is_default FROM delivery_addresses WHERE user_id = ? ORDER BY is_default DESC',
      [userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      data: addresses || [],
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get addresses',
    });
  }
};

// Add delivery address
export const addDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { address, is_default } = req.body;

    if (!userId || !address) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID and address are required',
      });
    }

    const connection = await pool.getConnection();
    
    // If this is default, remove default from other addresses
    if (is_default) {
      await connection.query(
        'UPDATE delivery_addresses SET is_default = FALSE WHERE user_id = ?',
        [userId]
      );
    }

    const [result] = await connection.query(
      'INSERT INTO delivery_addresses (user_id, address, is_default) VALUES (?, ?, ?)',
      [userId, address, is_default ? true : false]
    );
    connection.release();

    res.status(201).json({
      status: 'CREATED',
      message: 'Address added successfully',
      data: {
        id: (result as any).insertId,
        address,
        is_default: is_default ? true : false,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to add address',
    });
  }
};

// Update delivery address
export const updateDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;
    const { address, is_default } = req.body;

    if (!userId || !addressId || !address) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID, address ID, and address are required',
      });
    }

    const connection = await pool.getConnection();
    
    // If this is default, remove default from other addresses
    if (is_default) {
      await connection.query(
        'UPDATE delivery_addresses SET is_default = FALSE WHERE user_id = ?',
        [userId]
      );
    }

    await connection.query(
      'UPDATE delivery_addresses SET address = ?, is_default = ? WHERE id = ? AND user_id = ?',
      [address, is_default ? true : false, addressId, userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Address updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to update address',
    });
  }
};

// Delete delivery address
export const deleteDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const { userId, addressId } = req.params;

    if (!userId || !addressId) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID and address ID are required',
      });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'DELETE FROM delivery_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Address deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to delete address',
    });
  }
};

// Update user settings
export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { dark_mode, notifications_enabled } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'User ID is required',
      });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE users SET dark_mode = COALESCE(?, dark_mode), notifications_enabled = COALESCE(?, notifications_enabled), updated_at = NOW() WHERE id = ?',
      [dark_mode !== undefined ? dark_mode : null, notifications_enabled !== undefined ? notifications_enabled : null, userId]
    );
    connection.release();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Settings updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
};

// Register push token for a user
export const registerPushToken = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { push_token } = req.body;

    if (!userId || !push_token) {
      return res.status(400).json({ status: 'BAD_REQUEST', message: 'User ID and push_token are required' });
    }

    const connection = await pool.getConnection();
    await connection.query('UPDATE users SET push_token = ?, updated_at = NOW() WHERE id = ?', [push_token, userId]);
    connection.release();

    res.status(200).json({ status: 'SUCCESS', message: 'Push token registered' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error instanceof Error ? error.message : 'Failed to register push token' });
  }
};

// Send push notification (broadcast or to specific users)
export const sendPushNotification = async (req: Request, res: Response) => {
  try {
    const { userIds, title, body, data, broadcast } = req.body;

    if (!title || !body) {
      return res.status(400).json({ status: 'BAD_REQUEST', message: 'Title and body are required' });
    }

    const connection = await pool.getConnection();

    let rows: any[] = [];

    if (broadcast) {
      const [users] = await connection.query('SELECT id, push_token FROM users WHERE notifications_enabled = TRUE AND push_token IS NOT NULL');
      rows = users as any[];
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const [users] = await connection.query('SELECT id, push_token FROM users WHERE id IN (?) AND push_token IS NOT NULL', [userIds]);
      rows = users as any[];
    } else {
      connection.release();
      return res.status(400).json({ status: 'BAD_REQUEST', message: 'Either broadcast=true or userIds array is required' });
    }

    // Log notification for each target
    for (const u of rows) {
      await connection.query('INSERT INTO notifications (title, body, data, target_user_id, created_at) VALUES (?, ?, ?, ?, NOW())', [title, body, JSON.stringify(data || {}), u.id]);
    }

    connection.release();

    // Get Socket.io instance from app
    const io = req.app?.locals?.io;

    // Send real-time notifications via WebSocket
    if (io) {
      const notification = { title, body, data: data || {}, timestamp: new Date().toISOString() };

      if (broadcast) {
        // Broadcast to all connected users
        io.to('broadcast').emit('notification', notification);
        console.log(`📢 Broadcast notification sent to all users`);
      } else {
        // Send to specific users
        for (const userId of userIds || []) {
          io.to(`user-${userId}`).emit('notification', notification);
        }
        console.log(`📨 Notification sent to ${userIds?.length || 0} specific user(s)`);
      }
    }

    // Send via Expo push service if available
    const messages = rows
      .map((u) => u.push_token)
      .filter(Boolean)
      .map((token) => ({ to: token, sound: 'default', title, body, data: data || {} }));

    // Use global fetch (Node 18+) to call Expo push API
    if (messages.length > 0) {
      // send individually (simple approach)
      for (const msg of messages) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(msg),
          });
        } catch (err) {
          console.error('Failed to send push to token', msg.to, err);
        }
      }
    }

    res.status(200).json({ status: 'SUCCESS', message: 'Notifications sent via WebSocket + Expo', targets: rows.length });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error instanceof Error ? error.message : 'Failed to send notifications' });
  }
};
