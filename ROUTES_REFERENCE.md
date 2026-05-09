# Milk App: User vs Admin Routes & Access Control

## Frontend Pages

### Public (No Login Required)
- **login.html** - Login page
- **register.html** - Registration page

### Requires Any Authenticated User (`enforceUserOrAdmin()`)
- **index.html** / **new-order.html** - Order milk products (customer-facing)
- **delivery.html** - Manage deliveries

### Admin-Only (Should use `enforceAdminOnly()` but currently NOT enforced ⚠️)
- **dashboard.html** - View stats, recent orders, top products
- **inventory.html** - Manage products (add/edit/delete)

### Unknown / Development
- **deleveryrc.html** - No authentication, unclear purpose

---

## Backend API Routes (backend/routes/api.php)

### Public Endpoints
| Action | Method | Description |
|--------|--------|-------------|
| `register` | POST | Create new user account |
| `login` | POST | Authenticate user |
| `logout` | Any | Destroy session |
| `me` | GET | Get current user session |

### Customer/User Endpoints (Require Login)
| Action | Method | Description |
|--------|--------|-------------|
| `sales` | GET, POST | View/create sales (for recording orders) |
| `generate-qr` | POST | Generate Bakong QR for payment |
| `verify-qr` | POST | Verify QR scan |
| `confirm-payment` | POST | Confirm payment |
| `transaction-status` | POST | Check transaction status |
| `my-transactions` | GET | View user's transaction history |

### Admin-Only Endpoints (Require `admin` Role)
| Action | Method | Description |
|--------|--------|-------------|
| `products` | GET, POST | Get all products / Create/Update product |

---

## Access Control Functions (frontend/js/roleControl.js)

| Function | Purpose |
|----------|---------|
| `enforceUserOrAdmin()` | Redirects to login if not authenticated. Shows/hides admin-only nav items. |
| `enforceAdminOnly()` | Redirects to `index.html` if not logged in OR not admin. |
| `enforceGuestOrUserProtected()` | Same as enforceUserOrAdmin() |
| `getCurrentUser()` | Fetches current user from `/me` API |
| `markAdminOnlyNav(role)` | Hides elements with `.admin-only` class if not admin |

---

## Current Issues ⚠️

1. **dashboard.html** - No authentication check, but should be admin-only
2. **inventory.html** - No authentication check, but should be admin-only
3. **deleveryrc.html** - No authentication, unclear if intentional

These pages call admin-only API endpoints (`products`), so non-admin users will get 401/403 errors when trying to use them, but they can still load the HTML.

---

## User Roles

| Role | Permissions |
|------|-------------|
| `customer` | Can place orders, make payments, view own transactions |
| `seller` | Same as customer (app currently doesn't distinguish) |
| `admin` | All customer permissions + manage products + view dashboard stats |

---

## Recommended Fixes

1. Add `<script>enforceAdminOnly();</script>` to:
   - dashboard.html
   - inventory.html

2. Consider renaming `enforceAdminOnly()` to something clearer like `requireAdminAccess()`

3. Determine purpose of `deleveryrc.html` - is it needed? Should it be protected?

4. Consider if `seller` role needs different permissions than `customer`

---

## Navigation Bar Pattern

All pages include this nav structure:
```html
<a href="dashboard.html">📊 Dashboard</a>
<a href="inventory.html">📦 Inventory</a>
<a href="new-order.html" class="nav-new">＋ New Order</a>
<a href="delivery.html">🚚 Delivery</a>
<a href="login.html" class="nav-logout">⏻ Logout</a>
```

Elements with `.admin-only` class are hidden from non-admin users via `markAdminOnlyNav()`.
