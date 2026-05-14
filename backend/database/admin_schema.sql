-- SQL Schema for Admin Role Structure (Improved)

-- Products table (Add missing columns if table exists)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    description TEXT,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Check if description column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = "products";
SET @columnname = "description";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE products ADD COLUMN description TEXT AFTER stock, ADD COLUMN image VARCHAR(500) AFTER description"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    delivery_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ensure total_revenue and delivery_status exist in orders
SET @tablename = "orders";
SET @columnname = "total_revenue";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE orders ADD COLUMN total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER user_id, ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'pending' AFTER status"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    type ENUM('IN', 'OUT') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    delivery_person_id INT,
    status VARCHAR(50) DEFAULT 'pending',
    address TEXT,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (delivery_person_id) REFERENCES users(id)
);
