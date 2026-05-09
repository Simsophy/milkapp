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

        // Check stock availability
        if ((int) $product['stock'] < $quantity) {
            return [
                'success' => false,
                'message' => 'Insufficient stock available.',
            ];
        }

        $cart = $this->getSessionCart();
        
        // Check if product already in cart
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

        // Find and update item
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

        // Re-index array
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

        $cart['items'] = array_filter($cart['items'], function($item) use ($productId) {
            return $item['product_id'] !== $productId;
        });

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
     * Clear entire cart
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
     * Create order from cart
     */
    public function createOrder(array $payload): array
    {
        $userId = $_SESSION['user']['id'] ?? null;
        $notes = (string) ($payload['notes'] ?? '');

        $cart = $this->getSessionCart();
        if (empty($cart['items'])) {
            return [
                'success' => false,
                'message' => 'Cart is empty.',
            ];
        }

        try {
            $this->conn->beginTransaction();

            // Create order header
            $stmt = $this->conn->prepare(
                'INSERT INTO orders (user_id, total_amount, status, payment_method, notes) 
                 VALUES (:user_id, :total_amount, :status, :payment_method, :notes)'
            );
            $stmt->execute([
                'user_id' => $userId,
                'total_amount' => $cart['total_amount'],
                'status' => 'pending',
                
                'notes' => $notes ?: null,
            ]);

            $orderId = (int) $this->conn->lastInsertId();

            // Create order items and reduce stock
            foreach ($cart['items'] as $item) {
                // Insert order item
                $stmt = $this->conn->prepare(
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) 
                     VALUES (:order_id, :product_id, :quantity, :unit_price, :subtotal)'
                );
                $stmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);

                // Reduce product stock
                $this->productModel->reduceStock($item['product_id'], $item['quantity']);

                // Log stock OUT
                $this->logStockMovement(
                    $item['product_id'],
                    'OUT',
                    $item['quantity'],
                    'order',
                    $orderId,
                    "Order #{$orderId}",
                    $userId
                );
            }

            $this->conn->commit();

            // Clear cart
            $this->clearCart();

            // Fetch full order details
            $order = $this->getOrderDetails($orderId);

            return [
                'success' => true,
                'message' => 'Order created successfully.',
                'data' => $order,
            ];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to create order.',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get all orders for current user
     */
    public function getOrders(): array
    {
        $userId = $_SESSION['user']['id'] ?? null;

        if (!$userId) {
            return [
                'success' => false,
                'message' => 'User not authenticated.',
            ];
        }

        $stmt = $this->conn->prepare(
            'SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method, 
                   
             FROM orders o
             WHERE o.user_id = :user_id
             ORDER BY o.created_at DESC'
        );
        $stmt->execute(['user_id' => $userId]);
        $orders = $stmt->fetchAll();

        // Get items for each order
        foreach ($orders as &$order) {
            $order['items'] = $this->getOrderItems($order['id']);
        }

        return [
            'success' => true,
            'data' => $orders,
        ];
    }

    /**
     * Get single order by ID
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

        return [
            'success' => true,
            'data' => $order,
        ];
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(array $payload): array
    {
        $orderId = (int) ($payload['order_id'] ?? 0);
        $status = (string) ($payload['status'] ?? '');

        if ($orderId <= 0 || !in_array($status, ['pending', 'paid', 'completed', 'cancelled'], true)) {
            return [
                'success' => false,
                'message' => 'Invalid order ID or status.',
            ];
        }

        $stmt = $this->conn->prepare('UPDATE orders SET status = :status WHERE id = :id');
        $updated = $stmt->execute([
            'status' => $status,
            'id' => $orderId,
        ]);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update order status.',
            ];
        }

        $order = $this->getOrderDetails($orderId);

        return [
            'success' => true,
            'message' => 'Order status updated.',
            'data' => $order,
        ];
    }

    // PRIVATE HELPER METHODS

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

    private function recalculateCartTotal(array &$cart): void
    {
        $total = 0;
        foreach ($cart['items'] as $item) {
            $total += (float) $item['subtotal'];
        }
        $cart['total_amount'] = round($total, 2);
    }

    private function getOrderDetails(int $orderId): ?array
    {
        $stmt = $this->conn->prepare(
            'SELECT o.id, o.user_id, o.total_amount, o.status, o.payment_method, 
                  
             FROM orders o
             WHERE o.id = :id'
        );
        $stmt->execute(['id' => $orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            return null;
        }

        $order['items'] = $this->getOrderItems($orderId);
        return $order;
    }

    private function getOrderItems(int $orderId): array
    {
        $stmt = $this->conn->prepare(
            'SELECT id, order_id, product_id, quantity, unit_price, subtotal, created_at
             FROM order_items
             WHERE order_id = :order_id'
        );
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    private function logStockMovement(
        int $productId,
        string $type,
        int $quantity,
        string $referenceType,
        int $referenceId,
        string $notes,
        ?int $userId
    ): bool
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO stock_logs (product_id, type, quantity, reference_type, reference_id, notes, created_by) 
             VALUES (:product_id, :type, :quantity, :reference_type, :reference_id, :notes, :created_by)'
        );

        return $stmt->execute([
            'product_id' => $productId,
            'type' => $type,
            'quantity' => $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'created_by' => $userId,
        ]);
    }
}
