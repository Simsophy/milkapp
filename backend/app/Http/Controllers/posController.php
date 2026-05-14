<?php
declare(strict_types=1);

require_once __DIR__ . '/../../Models/Product.php';

class POSController
{
    private PDO $conn;
    private Product $productModel;
    private const SESSION_CART_KEY = 'pos_cart';

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->productModel = new Product($db);
    }

    /**
     * Get current shopping cart from session
     */
    public function getCart(): array
    {
        $cart = $this->getSessionCart();

        return [
            'success' => true,
            'data' => $cart,
        ];
    }

    /**
     * Add item to cart
     */
    public function addToCart(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);

        if ($productId <= 0 || $quantity <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID or quantity.',
            ];
        }

        $product = $this->productModel->findById($productId);

        if (!$product) {
            return [
                'success' => false,
                'message' => 'Product not found.',
            ];
        }

        if ((int) $product['stock'] < $quantity) {
            return [
                'success' => false,
                'message' => 'Insufficient stock available.',
            ];
        }

        $cart = $this->getSessionCart();

        $found = false;

        foreach ($cart['items'] as &$item) {
            if ($item['product_id'] === $productId) {

                $newQuantity = $item['quantity'] + $quantity;

                if ((int) $product['stock'] < $newQuantity) {
                    return [
                        'success' => false,
                        'message' => 'Insufficient stock for requested quantity.',
                    ];
                }

                $item['quantity'] = $newQuantity;
                $item['subtotal'] = (float) $product['price'] * $newQuantity;

                $found = true;
                break;
            }
        }

        if (!$found) {
            $cart['items'][] = [
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => (float) $product['price'],
                'subtotal' => (float) $product['price'] * $quantity,
            ];
        }

        $this->recalculateCartTotal($cart);
        $this->setSessionCart($cart);

        return [
            'success' => true,
            'message' => 'Item added to cart.',
            'data' => $cart,
        ];
    }

    /**
     * Update quantity of item in cart
     */
    public function updateCartItem(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);

        if ($productId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID.',
            ];
        }

        if ($quantity < 0) {
            return [
                'success' => false,
                'message' => 'Quantity cannot be negative.',
            ];
        }

        $cart = $this->getSessionCart();

        foreach ($cart['items'] as $key => &$item) {

            if ($item['product_id'] === $productId) {

                if ($quantity === 0) {

                    unset($cart['items'][$key]);

                } else {

                    $product = $this->productModel->findById($productId);

                    if (!$product || (int) $product['stock'] < $quantity) {
                        return [
                            'success' => false,
                            'message' => 'Insufficient stock for requested quantity.',
                        ];
                    }

                    $item['quantity'] = $quantity;
                    $item['subtotal'] = (float) $product['price'] * $quantity;
                }

                break;
            }
        }

        $cart['items'] = array_values($cart['items']);

        $this->recalculateCartTotal($cart);
        $this->setSessionCart($cart);

        return [
            'success' => true,
            'message' => 'Cart updated.',
            'data' => $cart,
        ];
    }

    /**
     * Remove item from cart
     */
    public function removeFromCart(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);

        if ($productId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID.',
            ];
        }

        $cart = $this->getSessionCart();

        $cart['items'] = array_filter(
            $cart['items'],
            fn($item) => $item['product_id'] !== $productId
        );

        $cart['items'] = array_values($cart['items']);

        $this->recalculateCartTotal($cart);
        $this->setSessionCart($cart);

        return [
            'success' => true,
            'message' => 'Item removed from cart.',
            'data' => $cart,
        ];
    }

    /**
     * Clear cart
     */
    public function clearCart(): array
    {
        $this->setSessionCart([
            'items' => [],
            'total_amount' => 0,
        ]);

        return [
            'success' => true,
            'message' => 'Cart cleared.',
            'data' => [
                'items' => [],
                'total_amount' => 0,
            ],
        ];
    }

    /**
     * Create order
     */
    public function createOrder(array $payload): array
    {
        $userId = $_SESSION['user']['id'] ?? null;
        $cart = $this->getSessionCart();

        if (empty($cart['items'])) {
            return [
                'success' => false,
                'message' => 'Cart is empty.',
            ];
        }

        try {
            $this->conn->beginTransaction();

            // INSERT ORDER
            $stmt = $this->conn->prepare(
                'INSERT INTO orders (user_id, total_revenue, status)
                 VALUES (:user_id, :total, :status)'
            );

            $stmt->execute([
                'user_id' => $userId,
                'total' => $cart['total_amount'],
                'status' => 'completed' // Assume completed for now
            ]);

            $orderId = (int) $this->conn->lastInsertId();

            // INSERT ORDER ITEMS & UPDATE STOCK & LOG INVENTORY
            foreach ($cart['items'] as $item) {
                // Fetch product name for the order_items table
                $product = $this->productModel->findById((int)$item['product_id']);
                $productName = $product ? $product['name'] : 'Unknown Product';

                // Insert order item
                $itemStmt = $this->conn->prepare(
                    'INSERT INTO order_items (order_id, product_id, quantity, price)
                     VALUES (:order_id, :product_id, :quantity, :price)'
                );

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['unit_price']
                ]);

                // Update product stock
                $this->productModel->reduceStock((int)$item['product_id'], (int)$item['quantity']);

                // Log inventory OUT transaction
                $invStmt = $this->conn->prepare(
                    'INSERT INTO inventory (product_id, quantity, type, notes)
                     VALUES (:product_id, :quantity, :type, :notes)'
                );

                $invStmt->execute([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'type' => 'OUT',
                    'notes' => 'Order #' . $orderId
                ]);
            }

            $this->conn->commit();

            // CLEAR CART
            $this->clearCart();

            return [
                'success' => true,
                'message' => 'Order created successfully.',
                'data' => [
                    'id' => $orderId,
                    'user_id' => $userId,
                    'total_revenue' => $cart['total_amount'],
                    'created_at' => date('Y-m-d H:i:s'),
                ],
            ];

        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to create order: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get orders
     */
    public function getOrders(): array
    {
        $user = $_SESSION['user'] ?? null;

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not authenticated.',
            ];
        }

        $isAdmin = in_array($user['role'], ['admin', 'seller']);
        
        $query = 'SELECT id, user_id, total_revenue as total, delivery_status, created_at FROM orders';
        $params = [];

        if (!$isAdmin) {
            $query .= ' WHERE user_id = :user_id';
            $params['user_id'] = $user['id'];
        }

        $query .= ' ORDER BY created_at DESC';

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);

        return [
            'success' => true,
            'data' => $stmt->fetchAll(),
        ];
    }

    /**
     * Get order by ID
     */
    public function getOrderById(array $payload): array
    {
        $orderId = (int) ($payload['order_id'] ?? 0);

        if ($orderId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid order ID.',
            ];
        }

        $order = $this->getOrderDetails($orderId);

        if (!$order) {
            return [
                'success' => false,
                'message' => 'Order not found.',
            ];
        }

        $order['items'] = $this->getOrderItems($orderId);

        return [
            'success' => true,
            'data' => $order,
        ];
    }

    /**
     * Update order status (DISABLED - orders table doesn't have status column)
     */
    /**
     * Update order status
     */
    public function updateOrderStatus(array $payload): array
    {
        $orderId = (int) ($payload['order_id'] ?? 0);
        $status = (string) ($payload['status'] ?? '');

        if ($orderId <= 0 || empty($status)) {
            return [
                'success' => false,
                'message' => 'Invalid order ID or status.',
            ];
        }

        try {
            $stmt = $this->conn->prepare(
                'UPDATE orders SET delivery_status = :status WHERE id = :id'
            );

            $stmt->execute([
                'status' => $status,
                'id' => $orderId,
            ]);

            return [
                'success' => true,
                'message' => 'Order status updated successfully.',
            ];
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Failed to update order status: ' . $e->getMessage(),
            ];
        }
    }

    /*
    OLD CODE - DISABLED
    public function updateOrderStatusOld(array $payload): array
    {
        $orderId = (int) ($payload['order_id'] ?? 0);
        $status = (string) ($payload['status'] ?? '');

        if (
            $orderId <= 0 ||
            !in_array($status, ['pending', 'paid', 'completed', 'cancelled'], true)
        ) {
            return [
                'success' => false,
                'message' => 'Invalid order ID or status.',
            ];
        }

        $stmt = $this->conn->prepare(
            'UPDATE orders
             SET status = :status
             WHERE id = :id'
        );

        $stmt->execute([
            'status' => $status,
            'id' => $orderId,
        ]);

        $order = $this->getOrderDetails($orderId);

        return [
            'success' => true,
            'message' => 'Order status updated.',
            'data' => $order,
        ];
    }
    */

    /**
     * SESSION CART
     */
    private function getSessionCart(): array
    {
        if (!isset($_SESSION[self::SESSION_CART_KEY])) {

            $_SESSION[self::SESSION_CART_KEY] = [
                'items' => [],
                'total_amount' => 0,
            ];
        }

        return $_SESSION[self::SESSION_CART_KEY];
    }

    private function setSessionCart(array $cart): void
    {
        $_SESSION[self::SESSION_CART_KEY] = $cart;
    }

    /**
     * CALCULATE TOTAL
     */
    private function recalculateCartTotal(array &$cart): void
    {
        $total = 0;

        foreach ($cart['items'] as $item) {
            $total += (float) $item['subtotal'];
        }

        $cart['total_amount'] = round($total, 2);
    }

    /**
     * GET ORDER DETAILS
     */
    private function getOrderDetails(int $orderId): ?array
    {
        $stmt = $this->conn->prepare(
            'SELECT id, user_id, total, created_at
             FROM orders
             WHERE id = :id'
        );

        $stmt->execute([
            'id' => $orderId,
        ]);

        $order = $stmt->fetch();

        return $order ?: null;
    }

    /**
     * GET ORDER ITEMS
     */
    private function getOrderItems(int $orderId): array
    {
        $stmt = $this->conn->prepare(
            'SELECT id, order_id, inventory_id as product_id, product_name, qty as quantity, total_price as subtotal, created_at
             FROM order_items
             WHERE order_id = :order_id'
        );

        $stmt->execute([
            'order_id' => $orderId,
        ]);

        return $stmt->fetchAll();
    }
}