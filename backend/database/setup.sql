-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS milk_app;
USE milk_app;

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- Create users table with correct schema
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer',
    api_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    stock INT DEFAULT 0,
    image_url VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2),
    delivery_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create order_items table (itemized products in each order)
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    inventory_id INT NOT NULL,
    product_name VARCHAR(255),
    total_price DECIMAL(10, 2),
    qty INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES products(id)
);

-- Create deliveries table (delivery tracking)
CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    delivery_date TIMESTAMP NULL,
    delivery_time TIME NULL,
    location VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_role ON users(role);
CREATE INDEX idx_product_category ON products(category);
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_order_status ON orders(delivery_status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_delivery_order ON deliveries(order_id);
