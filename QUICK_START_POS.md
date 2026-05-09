# Quick Start Guide - POS System

## Getting Started

### 1. Database Setup
The database schema has been automatically created. Three sample products are pre-loaded:
- Fresh Whole Milk ($2.50) - 50 units in stock
- Organic Almond Milk ($4.00) - 30 units in stock
- Premium Oat Milk ($4.50) - 25 units in stock

No additional database setup is required.

### 2. Access the System

#### Login
- Navigate to: `http://localhost:8000/frontend/` (or your dev server URL)
- Username: `admin`
- Password: Use the credential from your setup

#### POS System
- **URL**: `http://localhost:8000/frontend/pos.html`
- **Features**: Shopping cart, product browsing, order creation, payment QR
- **For**: Sellers ringing up customer orders

#### Inventory Dashboard
- **URL**: `http://localhost:8000/frontend/inventory-dashboard.html`
- **Features**: Stock levels, alerts, stock IN/OUT operations, audit logs
- **For**: Admin/inventory managers monitoring stock

#### Main Dashboard
- **URL**: `http://localhost:8000/frontend/index.html`
- **Features**: Overview, sales, navigation
- **For**: Quick access to all system features

## Testing Workflows

### Workflow 1: Complete a Sale (5 minutes)

1. Go to POS System (`pos.html`)
2. Click "Add to Cart" on any product (e.g., Fresh Whole Milk)
3. In the sidebar, see it appear with quantity 1
4. Click "Proceed to Checkout"
5. Add optional notes (e.g., "Customer special request")
6. Click "Confirm & Pay"
7. See order created with order ID and payment QR token
8. Order completes and stock automatically decreases

### Workflow 2: Monitor Stock & Add Inventory (5 minutes)

1. Go to Inventory Dashboard (`inventory-dashboard.html`)
2. See current stock levels in the table
3. Note any "Low Stock" items in alerts section
4. Click "Stock In" button
5. Select a product and quantity (e.g., Fresh Whole Milk, 20 units)
6. Optionally select a supplier or add notes
7. Click "Add Stock"
8. Verify stock increased in the table
9. Check that stock_logs was updated (audit trail)

### Workflow 3: Manual Stock Adjustment (3 minutes)

1. In Inventory Dashboard, click "Stock Out" button
2. Select a product (e.g., Organic Almond Milk)
3. Enter quantity to remove (e.g., 2 units)
4. Add reason (e.g., "Damaged goods")
5. Click "Remove Stock"
6. Verify stock decreased
7. Note movement recorded in stock_logs

### Workflow 4: Test Stock Validation (2 minutes)

1. Go to POS System
2. Note current stock for Fresh Whole Milk
3. Try adding more to cart than available stock
4. See error: "Insufficient stock"
5. Add fewer items than available
6. Verify "Add to Cart" succeeds

### Workflow 5: Monitor Stock Alerts (3 minutes)

1. Go to Inventory Dashboard
2. Note products with stock below minimum level
3. Alerts section shows low-stock and out-of-stock items
4. Run "Stock Out" to get a product below min level
5. See it appear in alerts (yellow/orange)
6. Get product to 0 stock
7. See it marked as critical (red)
8. Click "Stock In" to restore

## API Testing (curl examples)

### Get Current Cart
```bash
curl http://localhost:8000/backend/routes/api.php?action=get-cart \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

### Add Product to Cart
```bash
curl http://localhost:8000/backend/routes/api.php?action=add-to-cart \
  -X POST \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'
```

### Create Order
```bash
curl http://localhost:8000/backend/routes/api.php?action=create-order \
  -X POST \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test order"}'
```

### Get Inventory
```bash
curl http://localhost:8000/backend/routes/api.php?action=get-inventory \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

### Check Stock Alerts
```bash
curl http://localhost:8000/backend/routes/api.php?action=check-stock-alerts \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

### Add Stock (Stock IN)
```bash
curl http://localhost:8000/backend/routes/api.php?action=stock-in \
  -X POST \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 10, "supplier_id": 1, "notes": "Restocking"}'
```

### Remove Stock (Stock OUT)
```bash
curl http://localhost:8000/backend/routes/api.php?action=stock-out \
  -X POST \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2, "notes": "Damaged goods"}'
```

### Get Stock Logs
```bash
curl http://localhost:8000/backend/routes/api.php?action=get-stock-logs \
  -X POST \
  -H "Cookie: PHPSESSID=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "limit": 20}'
```

## Database Queries (for verification)

### Check Current Inventory
```sql
SELECT id, name, stock, price FROM products ORDER BY name;
```

### View Stock Logs
```sql
SELECT sl.*, p.name 
FROM stock_logs sl
LEFT JOIN products p ON p.id = sl.product_id
ORDER BY sl.created_at DESC
LIMIT 50;
```

### Check Orders
```sql
SELECT o.*, COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### View Order Details
```sql
SELECT 
    o.id, o.total_amount, o.status, o.created_at,
    oi.product_id, p.name, oi.quantity, oi.unit_price
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON p.id = oi.product_id
ORDER BY o.created_at DESC;
```

### Check Suppliers
```sql
SELECT * FROM suppliers;
```

### View Product Stock Settings
```sql
SELECT pss.*, p.name, p.stock 
FROM product_stock_settings pss
LEFT JOIN products p ON p.id = pss.product_id;
```

## Key Endpoints Summary

| Action | Method | Purpose |
|--------|--------|---------|
| add-to-cart | POST | Add item to cart |
| update-cart-item | POST | Change quantity |
| remove-from-cart | POST | Delete item from cart |
| clear-cart | POST | Empty entire cart |
| create-order | POST | Create order from cart |
| get-inventory | GET | Get all products with stock |
| check-stock-alerts | GET | Get low-stock warnings |
| stock-in | POST | Receive stock from supplier |
| stock-out | POST | Manual stock removal |
| get-stock-logs | POST | View stock audit trail |
| get-suppliers | GET | List all suppliers |

## Troubleshooting

**"Cart is empty"**
- Ensure you're adding products before checkout
- Check that product has stock available

**"Order not created"**
- Verify all items are still in stock
- Check browser console for error messages

**"Stock not updated"**
- Refresh page to see latest inventory
- Check stock_logs table for the entry

**"Can't login"**
- Use username: `admin`
- Password: the one from your setup

**"Endpoints returning errors"**
- Verify you're logged in (session exists)
- Check that user role permits operation (admin for stock operations)
- Review browser console network tab

## Next Steps

After testing the workflows:
1. Review the database schema in `backend/database/schema.sql`
2. Check API implementation in `backend/routes/api.php`
3. Examine frontend code in `frontend/js/pos.ts` and `frontend/js/inventory.ts`
4. Customize product images/styling in CSS
5. Configure Bakong payment credentials for live payments
6. Add additional users with seller role for multi-operator support
7. Create additional suppliers for reordering workflows

For detailed information, see `POS_SYSTEM_GUIDE.md`

---

**Happy Testing!**
