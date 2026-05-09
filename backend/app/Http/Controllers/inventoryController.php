<?php
declare(strict_types=1);

require_once __DIR__ . '/../../Models/Product.php';

class InventoryController
{
    private PDO $conn;
    private Product $productModel;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->productModel = new Product($db);
    }

    /**
     * Get full inventory with stock levels
     */
    public function getInventory(): array
    {
        $stmt = $this->conn->query(
            'SELECT p.id, p.name, p.price, p.category, p.stock, p.image_url, p.created_at, p.updated_at,
                    pss.min_stock_level, pss.reorder_quantity, pss.default_supplier_id,
                    CASE WHEN p.stock <= pss.min_stock_level THEN 1 ELSE 0 END as is_low_stock
             FROM products p
             LEFT JOIN product_stock_settings pss ON p.id = pss.product_id
             ORDER BY p.name'
        );

        $products = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $products,
        ];
    }

    /**
     * Check stock alerts (products below minimum level)
     */
    public function checkStockAlerts(): array
    {
        $stmt = $this->conn->query(
            'SELECT p.id as product_id, p.name as product_name, p.stock as current_stock,
                    pss.min_stock_level, pss.reorder_quantity,
                    CASE WHEN p.stock <= pss.min_stock_level THEN 1 ELSE 0 END as is_low_stock
             FROM products p
             LEFT JOIN product_stock_settings pss ON p.id = pss.product_id
             WHERE p.stock <= pss.min_stock_level OR pss.id IS NULL
             ORDER BY p.stock ASC'
        );

        $alerts = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $alerts,
        ];
    }

    /**
     * Get stock information for a specific product
     */
    public function getProductStock(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);

        if ($productId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid product ID.',
            ];
        }

        $stmt = $this->conn->prepare(
            'SELECT p.id, p.name, p.price, p.stock,
                    pss.min_stock_level, pss.reorder_quantity, pss.default_supplier_id
             FROM products p
             LEFT JOIN product_stock_settings pss ON p.id = pss.product_id
             WHERE p.id = :id'
        );
        $stmt->execute(['id' => $productId]);
        $product = $stmt->fetch();

        if (!$product) {
            return [
                'success' => false,
                'message' => 'Product not found.',
            ];
        }

        return [
            'success' => true,
            'data' => $product,
        ];
    }

    /**
     * Add stock (Stock IN - receive from supplier)
     */
    public function stockIn(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);
        $supplierId = isset($payload['supplier_id']) ? (int) $payload['supplier_id'] : null;
        $notes = (string) ($payload['notes'] ?? '');
        $userId = $_SESSION['user']['id'] ?? null;

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

        try {
            $this->conn->beginTransaction();

            // Add stock
            $newStock = (int) $product['stock'] + $quantity;
            $stmt = $this->conn->prepare('UPDATE products SET stock = :stock WHERE id = :id');
            $stmt->execute(['stock' => $newStock, 'id' => $productId]);

            // Log stock movement
            $stmt = $this->conn->prepare(
                'INSERT INTO stock_logs (product_id, type, quantity, reference_type, reference_id, notes, created_by) 
                 VALUES (:product_id, :type, :quantity, :reference_type, :reference_id, :notes, :created_by)'
            );
            $stmt->execute([
                'product_id' => $productId,
                'type' => 'IN',
                'quantity' => $quantity,
                'reference_type' => $supplierId ? 'supplier' : 'manual',
                'reference_id' => $supplierId,
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            $this->conn->commit();

            return [
                'success' => true,
                'message' => "Stock added successfully. New quantity: {$newStock}",
                'data' => [
                    'product_id' => $productId,
                    'quantity_added' => $quantity,
                    'new_stock' => $newStock,
                ],
            ];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to add stock.',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Remove stock (Stock OUT - manual removal, not from orders)
     */
    public function stockOut(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);
        $notes = (string) ($payload['notes'] ?? '');
        $userId = $_SESSION['user']['id'] ?? null;

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
                'message' => 'Insufficient stock for removal.',
            ];
        }

        try {
            $this->conn->beginTransaction();

            // Reduce stock
            $newStock = (int) $product['stock'] - $quantity;
            $stmt = $this->conn->prepare('UPDATE products SET stock = :stock WHERE id = :id');
            $stmt->execute(['stock' => $newStock, 'id' => $productId]);

            // Log stock movement
            $stmt = $this->conn->prepare(
                'INSERT INTO stock_logs (product_id, type, quantity, reference_type, notes, created_by) 
                 VALUES (:product_id, :type, :quantity, :reference_type, :notes, :created_by)'
            );
            $stmt->execute([
                'product_id' => $productId,
                'type' => 'OUT',
                'quantity' => $quantity,
                'reference_type' => 'manual_adjustment',
                'notes' => $notes,
                'created_by' => $userId,
            ]);

            $this->conn->commit();

            return [
                'success' => true,
                'message' => "Stock removed successfully. New quantity: {$newStock}",
                'data' => [
                    'product_id' => $productId,
                    'quantity_removed' => $quantity,
                    'new_stock' => $newStock,
                ],
            ];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to remove stock.',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get stock movement log
     */
    public function getStockLogs(array $payload): array
    {
        $productId = isset($payload['product_id']) ? (int) $payload['product_id'] : null;
        $limit = (int) ($payload['limit'] ?? 50);
        $limit = min($limit, 500);

        $query = 'SELECT sl.id, sl.product_id, p.name as product_name, sl.type, sl.quantity,
                         sl.reference_type, sl.reference_id, sl.notes, sl.created_by, sl.created_at
                  FROM stock_logs sl
                  LEFT JOIN products p ON p.id = sl.product_id';

        $params = [];
        if ($productId) {
            $query .= ' WHERE sl.product_id = :product_id';
            $params['product_id'] = $productId;
        }

        $query .= ' ORDER BY sl.created_at DESC LIMIT :limit';

        $stmt = $this->conn->prepare($query);
        if ($productId) {
            $stmt->bindValue(':product_id', $params['product_id'], PDO::PARAM_INT);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $logs = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $logs,
        ];
    }

    /**
     * Update product stock directly (for manual adjustments)
     */
    public function updateProductStock(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);
        $notes = (string) ($payload['notes'] ?? '');
        $userId = $_SESSION['user']['id'] ?? null;

        if ($productId <= 0 || $quantity < 0) {
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

        try {
            $this->conn->beginTransaction();

            $oldStock = (int) $product['stock'];
            $diff = $quantity - $oldStock;

            // Update stock
            $stmt = $this->conn->prepare('UPDATE products SET stock = :stock WHERE id = :id');
            $stmt->execute(['stock' => $quantity, 'id' => $productId]);

            // Log the adjustment
            $type = $diff > 0 ? 'IN' : 'OUT';
            $qty = abs($diff);

            if ($qty > 0) {
                $stmt = $this->conn->prepare(
                    'INSERT INTO stock_logs (product_id, type, quantity, reference_type, notes, created_by) 
                     VALUES (:product_id, :type, :quantity, :reference_type, :notes, :created_by)'
                );
                $stmt->execute([
                    'product_id' => $productId,
                    'type' => $type,
                    'quantity' => $qty,
                    'reference_type' => 'adjustment',
                    'notes' => $notes,
                    'created_by' => $userId,
                ]);
            }

            $this->conn->commit();

            return [
                'success' => true,
                'message' => "Product stock updated to {$quantity}",
                'data' => [
                    'product_id' => $productId,
                    'old_stock' => $oldStock,
                    'new_stock' => $quantity,
                    'difference' => $diff,
                ],
            ];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to update product stock.',
                'error' => $e->getMessage(),
            ];
        }
    }
}
