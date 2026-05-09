<?php
declare(strict_types=1);

class Order
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    /**
     * Create a new order (stored in `sales` table).
     */
    public function create(int $productId, int $quantity, float $totalPrice): int
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO sales (product_id, quantity, total_price)
             VALUES (:product_id, :quantity, :total_price)'
        );

        $stmt->execute([
            'product_id' => $productId,
            'quantity' => $quantity,
            'total_price' => number_format($totalPrice, 2, '.', ''),
        ]);

        return (int) $this->conn->lastInsertId();
    }

    /**
     * List all orders with product info.
     */
    public function getAll(): array
    {
        $stmt = $this->conn->query(
            'SELECT s.id, s.product_id, p.name AS product_name, s.quantity, s.total_price, s.sale_date
             FROM sales s
             LEFT JOIN products p ON p.id = s.product_id
             ORDER BY s.sale_date DESC, s.id DESC'
        );

        return $stmt->fetchAll();
    }

    /**
     * Get one order by id.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->conn->prepare(
            'SELECT s.id, s.product_id, p.name AS product_name, s.quantity, s.total_price, s.sale_date
             FROM sales s
             LEFT JOIN products p ON p.id = s.product_id
             WHERE s.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);

        $order = $stmt->fetch();
        return $order ?: null;
    }
}
