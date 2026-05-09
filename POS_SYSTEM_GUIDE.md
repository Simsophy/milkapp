# POS System Upgrade - Milk App

## Overview

The milk-app has been successfully upgraded from a basic e-commerce system to a complete **Point-of-Sale (POS) System** with real-time inventory management and stock tracking. This guide explains the new features, architecture, and how to use the system.

## Key Features

### 1. POS Sales Engine (Shopping Cart & Checkout)
- **Real-time Shopping Cart**: Session-based cart with instant updates
- **Product Selection**: Browse and add products with stock validation
- **Cart Management**: Update quantities or remove items on-the-fly
- **Order Creation**: Finalize orders with automatic stock reduction
- **Bakong Payment Integration**: Seamless payment QR generation and confirmation
- **Receipt Ready**: Complete order records for customer receipts

**Access**: Navigate to `/frontend/pos.html` after login

### 2. Inventory System
- **Real-time Stock Tracking**: Current stock levels for all products
- **Stock Alerts**: Low-stock and out-of-stock warnings
- **Inventory Dashboard**: Comprehensive view of product inventory
- **Stock Status Indicators**: Visual indicators for product availability
- **Stock Levels**: Configure minimum stock levels and reorder quantities
- **Supplier Tracking**: Link products to default suppliers

**Access**: Navigate to `/frontend/inventory-dashboard.html` after login

### 3. Stock Tracking Engine
- **Stock IN Operations**: Receive stock from suppliers with audit trail
- **Stock OUT Operations**: Manual stock adjustments with reasons
- **Audit Logs**: Complete history of all stock movements
- **Movement Reports**: Track stock IN/OUT activities
- **Automatic Logging**: Orders automatically log stock OUT movements

**Access**: Through Inventory Dashboard Stock In/Stock Out buttons

## Architecture

### Database Schema

#### New Tables Created:

1. **`stock_logs`** - Immutable audit trail
   - Tracks all stock movements (IN/OUT)
   - Links to orders for traceability
   - Records user who made the change

2. **`orders`** - Order management
   - Main order records
   - Order status tracking (pending/paid/completed/cancelled)
   - Links to Bakong payment transactions

3. **`order_items`** - Line items per order
   - Product details for each order item
   - Quantity and pricing information
   - Maintains product history even if product is updated

4. **`suppliers`** - Supplier management
   - Track inventory sources
   - Contact information
   - Linked to stock IN operations

5. **`product_stock_settings`** - Stock control parameters
   - Minimum stock levels per product
   - Reorder quantities
   - Default supplier assignments

#### Modified Tables:

- **`products`** - Added timestamps
  - `created_at` and `updated_at` fields for tracking

### API Endpoints

#### Cart Management
- `POST /routes/api.php?action=get-cart` - Get current cart
- `POST /routes/api.php?action=add-to-cart` - Add product to cart
- `POST /routes/api.php?action=update-cart-item` - Update quantity
- `POST /routes/api.php?action=remove-from-cart` - Remove product
- `POST /routes/api.php?action=clear-cart` - Empty cart

#### Order Management
- `POST /routes/api.php?action=create-order` - Create order from cart
- `GET /routes/api.php?action=get-orders` - Get user's orders
- `POST /routes/api.php?action=get-order` - Get order details
- `POST /routes/api.php?action=update-order-status` - Change order status

#### Inventory
- `GET /routes/api.php?action=get-inventory` - Get all products with stock info
- `POST /routes/api.php?action=check-stock-alerts` - Get low-stock warnings
- `POST /routes/api.php?action=get-product-stock` - Get specific product stock

#### Stock Tracking (Admin Only)
- `POST /routes/api.php?action=stock-in` - Add stock from supplier
- `POST /routes/api.php?action=stock-out` - Remove stock manually
- `POST /routes/api.php?action=get-stock-logs` - View stock movement history
- `POST /routes/api.php?action=update-product-stock` - Direct stock adjustment

#### Supplier Management (Admin Only)
- `GET /routes/api.php?action=get-suppliers` - List suppliers
- `POST /routes/api.php?action=create-supplier` - Add supplier
- `POST /routes/api.php?action=update-supplier` - Edit supplier
- `POST /routes/api.php?action=delete-supplier` - Remove supplier

### Backend Controllers

1. **posController.php** - Shopping cart and order management
   - Cart operations (session-based)
   - Order creation with automatic stock reduction
   - Order status management

2. **inventoryController.php** - Stock and inventory management
   - Stock IN/OUT operations
   - Stock log tracking
   - Inventory queries and alerts

3. **supplierController.php** - Supplier management
   - CRUD operations for suppliers
   - Supplier deletion with cascade updates

### Frontend Components

1. **pos.html & pos.ts** - Point of Sale Interface
   - Product browsing with search
   - Shopping cart sidebar
   - Checkout modal
   - Payment QR generation

2. **inventory-dashboard.html & inventory.ts** - Inventory Management
   - Stock level overview
   - Alert system for low stock
   - Stock IN/OUT operations
   - Inventory filtering and search

3. **types.ts** - TypeScript Interfaces
   - Cart and CartItem types
   - Order and OrderItem types
   - StockLog and StockAlert types
   - Supplier types

4. **api.ts** - API Client Functions
   - All new POS API calls
   - Stock management functions
   - Supplier management functions

## Workflow Examples

### Selling a Product (POS Flow)
1. User logs in and navigates to `/frontend/pos.html`
2. Browses available products (filtered by stock availability)
3. Clicks "Add to Cart" to add products
4. Views cart in sidebar with running total
5. Clicks "Proceed to Checkout"
6. Reviews order summary and adds optional notes
7. Clicks "Confirm & Pay" to create order
8. Order created, stock automatically reduced
9. Payment QR generated for Bakong transaction
10. Order marked as pending until payment confirmed

### Managing Stock (Inventory Flow)
1. Admin logs in and navigates to `/frontend/inventory-dashboard.html`
2. Views current inventory with stock levels
3. Sees stock alerts for low-stock items
4. Clicks "Stock In" to receive products from supplier
5. Selects product, quantity, supplier, and notes
6. Stock increases, movement logged to stock_logs
7. Can also use "Stock Out" for manual adjustments
8. Stock logs searchable and filterable for audit trail

## Key Business Logic

### Stock Validation
- **Overselling Prevention**: Cannot add to cart if stock insufficient
- **Real-time Checks**: Stock validated at cart addition and order creation
- **Automatic Reduction**: Order creation immediately reduces stock

### Stock Tracking
- **Immutable Logs**: All movements recorded to stock_logs permanently
- **Current State**: products.stock always reflects current inventory
- **Traceability**: Every movement links to user and reason

### Order Management
- **Status Lifecycle**: pending → paid → completed → cancelled
- **Bakong Integration**: Orders link to bakong_transactions for payment tracking
- **Order Preservation**: order_items preserve product details at sale time

### Minimum Stock Levels
- **Alerts**: Products below min_stock_level trigger alerts
- **Reorder Quantity**: Suggestion for how much to order when reordering
- **Default Supplier**: Quick reference for supplier relationship

## Security

- **Role-Based Access**: Admin-only operations for stock management
- **Session-Based Cart**: Cart data stored in server session, not exposed
- **Input Validation**: All inputs validated before database operations
- **Transaction Safety**: Stock operations wrapped in database transactions
- **Audit Trail**: Complete history for compliance and troubleshooting

## Performance Considerations

- **Session Cart**: Reduces database overhead vs. persistent carts
- **Stock Logs**: Indexed by product_id, type, and created_at for fast queries
- **Orders**: Indexed by user_id and created_at
- **Batch Alerts**: Single query for all low-stock warnings

## Testing Checklist

- [ ] Login and access POS system
- [ ] Add products to cart (verify stock validation)
- [ ] Update cart quantities
- [ ] Remove items from cart
- [ ] Create order from cart
- [ ] Verify stock reduced after order
- [ ] Access inventory dashboard
- [ ] View stock alerts
- [ ] Use Stock In to add inventory
- [ ] Use Stock Out for manual adjustment
- [ ] Check stock logs for audit trail
- [ ] Create multiple orders
- [ ] Verify payment QR generation
- [ ] Test with low-stock products
- [ ] Test with out-of-stock products

## Troubleshooting

### Cart Not Showing Items
- Verify session is active (check cookies)
- Ensure user is logged in
- Check browser console for API errors

### Stock Not Decreasing
- Verify order was created successfully
- Check order status is not 'cancelled'
- Review stock_logs for OUT entries

### Stock Alerts Not Showing
- Ensure products have min_stock_level configured
- Check current stock vs. minimum level
- Refresh page to reload alerts

### Payment QR Not Generating
- Verify Bakong credentials in .env
- Check order amount is valid
- Review server logs for Bakong API errors

## Future Enhancements

1. **Multi-location Support** - Manage inventory across multiple stores
2. **Batch Operations** - Receive stock for multiple products at once
3. **Stock Transfers** - Move stock between locations
4. **Forecasting** - Predict stock needs based on sales trends
5. **Barcode Scanning** - Quick product lookup via barcode
6. **Receipt Printing** - Thermal printer integration
7. **Reports** - Sales reports, inventory valuation reports
8. **Pricing Tiers** - Volume discounts, customer-specific pricing
9. **Wishlists** - Customer product tracking and requests
10. **Low Stock Notifications** - Email/SMS alerts for reordering

## File Structure

```
milk-app/
├── backend/
│   ├── controllers/
│   │   ├── posController.php (NEW)
│   │   ├── inventoryController.php (NEW)
│   │   └── supplierController.php (NEW)
│   ├── database/
│   │   └── schema.sql (UPDATED - added 5 new tables)
│   └── routes/
│       └── api.php (UPDATED - added ~20 new endpoints)
├── frontend/
│   ├── pos.html (NEW - POS interface)
│   ├── inventory-dashboard.html (NEW - inventory management)
│   ├── js/
│   │   ├── pos.ts (NEW - POS logic)
│   │   ├── inventory.ts (NEW - inventory logic)
│   │   ├── api.ts (UPDATED - new API functions)
│   │   └── types.ts (UPDATED - new interfaces)
│   └── ...
└── POS_SYSTEM_GUIDE.md (THIS FILE)
```

## Support

For issues or questions about the POS system, refer to:
- Database schema in `backend/database/schema.sql`
- API implementation in `backend/routes/api.php`
- Frontend UI in `frontend/pos.html` and `frontend/inventory-dashboard.html`
- Type definitions in `frontend/js/types.ts`

---

**System Upgrade Date**: May 4, 2026
**Version**: 2.0 (POS Edition)
