-- Create orders table
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
);

-- Create order status history table for tracking
CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
);
