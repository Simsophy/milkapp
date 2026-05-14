<?php
declare(strict_types=1);

class Inventory
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    /**
     * Record a stock transaction (IN or OUT)
     */
    public function logTransaction(int $productId, int $quantity, string $type, ?string $notes = null): bool
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO inventory (product_id, quantity, type, notes)
             VALUES (:product_id, :quantity, :type, :notes)'
        );

        return $stmt->execute([
            'product_id' => $productId,
            'quantity' => $quantity,
            'type' => strtoupper($type),
            'notes' => $notes,
        ]);
    }

    /**
     * Get stock movement history
     */
    public function getHistory(?int $productId = null, int $limit = 50): array
    {
        $query = 'SELECT i.*, p.name as product_name
                  FROM inventory i
                  JOIN products p ON i.product_id = p.id';
        
        $params = [];
        if ($productId) {
            $query .= ' WHERE i.product_id = :product_id';
            $params['product_id'] = $productId;
        }
        
        $query .= ' ORDER BY i.created_at DESC LIMIT ' . (int)$limit;
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
