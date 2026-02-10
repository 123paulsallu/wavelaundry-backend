import pool from '../config/database.js';

export const addMissingColumns = async () => {
  try {
    const connection = await pool.getConnection();

    console.log('🔄 Adding missing columns to users table...');

    // Add push_token column
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS push_token VARCHAR(500) NULL
    `);
    console.log('✅ Added push_token column');

    // Add dark_mode column
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Added dark_mode column');

    // Add notifications_enabled column
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE
    `);
    console.log('✅ Added notifications_enabled column');

    // Create notifications table if it doesn't exist
    console.log('🔄 Creating notifications table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSON DEFAULT NULL,
        target_user_id INT DEFAULT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_sent (target_user_id, sent_at)
      )
    `);
    console.log('✅ Created notifications table');

    // Create delivery_addresses table if it doesn't exist
    console.log('🔄 Creating delivery_addresses table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS delivery_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        address TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      )
    `);
    console.log('✅ Created delivery_addresses table');

    connection.release();
    console.log('✅ Database schema migration completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};
