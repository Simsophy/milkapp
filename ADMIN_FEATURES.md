# Admin Features Documentation

## Overview
This guide explains the new admin features for managing users and products in the Milk App.

## What's New

### 1. **User Management**
Admins can now control user roles and manage all users in the system.

**Features:**
- View all users (ID, username, email, phone, role)
- Change user roles (Customer, Seller, Admin)
- User role filtering with color-coded badges

**Access:**
- Navigate to `/admin/manage` or click "⚙️ Manage System" from the dashboard (admins only)
- Or use API: `GET /routes/api.php?action=users`

### 2. **Product Management**
Admins can upload, manage, and delete products from the store.

**Features:**
- Upload new products (name, description, category, price, stock, image URL)
- View all products with pricing and stock levels
- Delete products from inventory
- Update product information
- Track product creation details

**Access:**
- Navigate to `/admin/manage` and click the Products tab
- Or use API endpoints below

## API Endpoints

### User Management

#### Get All Users
```
GET /routes/api.php?action=users
Requires: Admin/Seller role
Response: {
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "phone": "1234567890",
      "role": "admin",
      "created_at": "2026-05-08 10:00:00"
    }
  ]
}
```

#### Update User Role
```
POST /routes/api.php?action=update-user-role
Requires: Admin/Seller role
Body: {
  "user_id": 5,
  "role": "seller"  // "customer", "seller", or "admin"
}
Response: {
  "success": true,
  "message": "User role updated successfully"
}
```

### Product Management

#### Get All Products
```
GET /routes/api.php?action=products
Response: {
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Full Cream Milk",
      "description": "Fresh full cream milk",
      "price": "5.50",
      "category": "Fresh Milk",
      "stock": 100,
      "image_url": "https://...",
      "created_at": "2026-05-08 10:00:00"
    }
  ]
}
```

#### Create Product (Upload)
```
POST /routes/api.php?action=products
Requires: Admin/Seller role
Body: {
  "name": "Chocolate Milk",
  "description": "Delicious chocolate flavored milk",
  "category": "Flavored",
  "price": 6.50,
  "stock": 50,
  "image_url": "https://example.com/image.jpg"
}
Response: {
  "success": true,
  "message": "Product created successfully",
  "product_id": 42
}
```

#### Update Product
```
PUT /routes/api.php?action=product
Requires: Admin/Seller role
Body: {
  "id": 42,
  "name": "Updated Name",
  "price": 7.00,
  "stock": 75
}
Response: {
  "success": true,
  "message": "Product updated successfully"
}
```

#### Delete Product
```
DELETE /routes/api.php?action=product?id=42
Requires: Admin/Seller role
Response: {
  "success": true,
  "message": "Product deleted successfully"
}
```

#### Update Product Stock
```
POST /routes/api.php?action=update-stock
Requires: Admin/Seller role
Body: {
  "id": 42,
  "quantity": 10  // Can be positive (add) or negative (subtract)
}
Response: {
  "success": true,
  "message": "Stock updated successfully"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer',  -- customer, seller, admin
    api_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    stock INT DEFAULT 0,
    image_url VARCHAR(500),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Orders Table
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## User Roles

### Customer
- Can browse and purchase products
- View personal orders
- Access: `/new-order`, `/user`

### Seller
- Can manage products (add, edit, delete)
- Can view inventory
- Access: `/admin`, `/admin/manage`, `/admin/inventory`

### Admin
- Full system access
- Can manage all users and change roles
- Can manage all products
- Access: All routes

## Admin Dashboard Routes

- `/admin` - Main dashboard
- `/admin/manage` - User and product management
- `/admin/inventory` - Product inventory
- `/admin/delivery` - Delivery management

## How to Use

### Add a New Product

1. Go to http://localhost:8000/admin/manage
2. Click on "📦 Manage Products" tab
3. Click "+ Add Product" button
4. Fill in:
   - Product Name (required)
   - Description (optional)
   - Category (optional)
   - Price (required)
   - Stock quantity
   - Image URL (optional)
5. Click "Add Product"

### Change User Role

1. Go to http://localhost:8000/admin/manage
2. Click on "👥 Manage Users" tab
3. Find the user in the list
4. Click "Change Role" button
5. Select new role (Customer, Seller, Admin)
6. Click "Update Role"

## Security Notes

- All admin operations require admin or seller role
- User role changes are logged
- Product operations track the admin/seller who created them
- All operations use secure session-based authentication
- Sensitive data (passwords) are hashed with PASSWORD_DEFAULT

## Troubleshooting

### Can't access admin panel
- Make sure you're logged in with an admin account
- Check that your role is set to "admin" in the users table
- Session may have expired, try logging out and back in

### Products not showing
- Make sure the products table exists (run `php backend/setup_database.php`)
- Check that the database is properly configured in `backend/config/db.php`

### API returns "Unauthorized"
- Your user account doesn't have admin/seller role
- Ask another admin to change your role via the management panel

## Next Steps

1. Test the admin management page
2. Create sample products
3. Test changing user roles
4. Integrate with the customer shopping interface
5. Add order management features
