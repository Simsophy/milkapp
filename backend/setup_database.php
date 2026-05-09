<?php
/**
 * Database Setup Script
 * This script creates the milk_app database and users table with the correct schema
 * Run this from command line: php backend/setup_database.php
 */

$host = 'localhost';
$port = '3306';
$username = 'root';
$password = '';

// Step 1: Connect to MySQL without specifying a database
echo "Connecting to MySQL server...\n";
try {
    $dsn = "mysql:host=$host;port=$port";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "✓ Connected to MySQL server\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to connect to MySQL: " . $e->getMessage() . "\n";
    echo "Please ensure MySQL is running and the credentials are correct.\n";
    exit(1);
}

// Step 2: Create database
echo "Creating database 'milk_app'...\n";
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS milk_app");
    echo "✓ Database created/verified\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to create database: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 3: Connect to the new database
echo "Connecting to 'milk_app' database...\n";
try {
    $dsn = "mysql:host=$host;port=$port;dbname=milk_app;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    echo "✓ Connected to 'milk_app' database\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to connect to database: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 4: Create users table
echo "Creating 'users' table...\n";
try {
    // Disable foreign key checks to drop tables in any order
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $pdo->exec("DROP TABLE IF EXISTS sales");
    $pdo->exec("DROP TABLE IF EXISTS orders");
    $pdo->exec("DROP TABLE IF EXISTS products");
    $pdo->exec("DROP TABLE IF EXISTS users");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    $pdo->exec("
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
        )
    ");
    echo "✓ Users table created\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to create users table: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 5: Create products table
echo "Creating 'products' table...\n";
try {
    $pdo->exec("
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
        )
    ");
    echo "✓ Products table created\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to create products table: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 6: Create orders table
echo "Creating 'orders' table...\n";
try {
    $pdo->exec("
        CREATE TABLE orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            total_price DECIMAL(10, 2),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ");
    echo "✓ Orders table created\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to create orders table: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 5: Create indexes
echo "Creating indexes...\n";
try {
    $pdo->exec("CREATE INDEX idx_username ON users(username)");
    $pdo->exec("CREATE INDEX idx_email ON users(email)");
    $pdo->exec("CREATE INDEX idx_role ON users(role)");
    $pdo->exec("CREATE INDEX idx_product_category ON products(category)");
    $pdo->exec("CREATE INDEX idx_order_user ON orders(user_id)");
    $pdo->exec("CREATE INDEX idx_order_status ON orders(status)");
    echo "✓ Indexes created\n\n";
} catch (PDOException $e) {
    echo "✗ Failed to create indexes: " . $e->getMessage() . "\n";
    exit(1);
}

// Step 6: Verify the setup
echo "Verifying setup...\n";
try {
    $tables = ['users', 'products', 'orders'];
    foreach ($tables as $table) {
        $result = $pdo->query("DESCRIBE $table")->fetchAll();
        echo "✓ $table structure:\n";
        foreach ($result as $column) {
            echo "  - {$column['Field']}: {$column['Type']}\n";
        }
        echo "\n";
    }
} catch (PDOException $e) {
    echo "✗ Failed to verify tables: " . $e->getMessage() . "\n";
    exit(1);
}

echo "═══════════════════════════════════════════════════════════\n";
echo "✓ Database setup completed successfully!\n";
echo "═══════════════════════════════════════════════════════════\n";
echo "\nYou can now:\n";
echo "1. Go to http://localhost:8000/register.html\n";
echo "2. Create a new account\n";
echo "3. The registration should work without errors\n";
