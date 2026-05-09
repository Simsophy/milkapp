<?php
declare(strict_types=1);

class Product
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    public function getAll(): array
    {
        $stmt = $this->conn->query('SELECT id, name, price, category, stock, image_url FROM products ORDER BY id ASC');
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->conn->prepare('SELECT id, name, price, category, stock, image_url FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();

        return $product ?: null;
    }

    public function create(string $name, float $price, string $category, int $stock = 0, ?string $imageUrl = null): int
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO products (name, price, category, stock, image_url)
             VALUES (:name, :price, :category, :stock, :image_url)'
        );

        $stmt->execute([
            'name' => $name,
            'price' => $price,
            'category' => $category,
            'stock' => $stock,
            'image_url' => $imageUrl,
        ]);

        return (int) $this->conn->lastInsertId();
    }

    public function reduceStock(int $productId, int $quantity): bool
    {
        $stmt = $this->conn->prepare(
            'UPDATE products
             SET stock = stock - :qty
             WHERE id = :id AND stock >= :qty'
        );

        $stmt->execute([
            'qty' => $quantity,
            'id' => $productId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function update(int $id, string $name, float $price, string $category, int $stock, ?string $imageUrl = null): bool
    {
        $stmt = $this->conn->prepare(
            'UPDATE products
             SET name = :name,
                 price = :price,
                 category = :category,
                 stock = :stock,
                 image_url = :image_url
             WHERE id = :id'
        );

        $stmt->execute([
            'name' => $name,
            'price' => $price,
            'category' => $category,
            'stock' => $stock,
            'image_url' => $imageUrl,
            'id' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }
}


