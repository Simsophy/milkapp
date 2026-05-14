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
            'SELECT id, name, price, category, stock, image_url
             FROM products
             ORDER BY name'
        );

        $products = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $products,
        ];
    }

    /**
     * Get stock movement log (History)
     */
    public function getStockLogs(array $payload): array
    {
        $productId = isset($payload['product_id']) ? (int) $payload['product_id'] : null;
        $limit = (int) ($payload['limit'] ?? 50);

        $query = 'SELECT i.*, p.name as product_name
                  FROM inventory i
                  JOIN products p ON i.product_id = p.id';

        $params = [];
        if ($productId) {
            $query .= ' WHERE i.product_id = :product_id';
            $params['product_id'] = $productId;
        }

        $query .= ' ORDER BY i.created_at DESC LIMIT :limit';

        $stmt = $this->conn->prepare($query);
        if ($productId) {
            $stmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
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
     * Add stock (Stock IN)
     */
    public function stockIn(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);
        $notes = (string) ($payload['notes'] ?? 'Manual Stock In');

        if ($productId <= 0 || $quantity <= 0) {
            return ['success' => false, 'message' => 'Invalid product or quantity'];
        }

        try {
            $this->conn->beginTransaction();

            // Update stock
            $stmt = $this->conn->prepare('UPDATE products SET stock = stock + :qty WHERE id = :id');
            $stmt->execute(['qty' => $quantity, 'id' => $productId]);

            // Log transaction
            $stmt = $this->conn->prepare('INSERT INTO inventory (product_id, quantity, type, notes) VALUES (:id, :qty, "IN", :notes)');
            $stmt->execute(['id' => $productId, 'qty' => $quantity, 'notes' => $notes]);

            $this->conn->commit();
            return ['success' => true, 'message' => 'Stock added successfully'];
        } catch (Throwable $e) {
            $this->conn->rollBack();
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Remove stock (Stock OUT)
     */
    public function stockOut(array $payload): array
    {
        $productId = (int) ($payload['product_id'] ?? 0);
        $quantity = (int) ($payload['quantity'] ?? 0);
        $notes = (string) ($payload['notes'] ?? 'Manual Stock Out');

        if ($productId <= 0 || $quantity <= 0) {
            return ['success' => false, 'message' => 'Invalid product or quantity'];
        }

        try {
            $this->conn->beginTransaction();

            // Update stock
            $stmt = $this->conn->prepare('UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty');
            $stmt->execute(['qty' => $quantity, 'id' => $productId]);

            if ($stmt->rowCount() === 0) {
                throw new Exception('Insufficient stock');
            }

            // Log transaction
            $stmt = $this->conn->prepare('INSERT INTO inventory (product_id, quantity, type, notes) VALUES (:id, :qty, "OUT", :notes)');
            $stmt->execute(['id' => $productId, 'qty' => $quantity, 'notes' => $notes]);

            $this->conn->commit();
            return ['success' => true, 'message' => 'Stock removed successfully'];
        } catch (Throwable $e) {
            $this->conn->rollBack();
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    /**
     * Check for low stock alerts
     */
    public function checkStockAlerts(): array
    {
        $stmt = $this->conn->query(
            'SELECT id, name, stock
             FROM products
             WHERE stock < 10
             ORDER BY stock ASC'
        );

        $alerts = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $alerts,
        ];
    }
}
