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
        $stmt = $this->conn->query('SELECT id, name, price, category, stock, description, image_url, created_at FROM products ORDER BY id DESC');
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->conn->prepare('SELECT id, name, price, category, stock, description, image_url, created_at FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();

        return $product ?: null;
    }

    public function create(string $name, float $price, string $category, int $stock = 0, ?string $description = null, ?string $image = null): int
    {
        $stmt = $this->conn->prepare(
            'INSERT INTO products (name, price, category, stock, description, image_url)
             VALUES (:name, :price, :category, :stock, :description, :image_url)'
        );

        $stmt->execute([
            'name' => $name,
            'price' => $price,
            'category' => $category,
            'stock' => $stock,
            'description' => $description,
            'image_url' => $image,
        ]);

        return (int) $this->conn->lastInsertId();
    }

    public function update(int $id, string $name, float $price, string $category, int $stock, ?string $description = null, ?string $image = null): bool
    {
        $stmt = $this->conn->prepare(
            'UPDATE products
             SET name = :name,
                 price = :price,
                 category = :category,
                 stock = :stock,
                 description = :description,
                 image_url = :image
             WHERE id = :id'
        );

        return $stmt->execute([
            'name' => $name,
            'price' => $price,
            'category' => $category,
            'stock' => $stock,
            'description' => $description,
            'image' => $image,
            'id' => $id,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare('DELETE FROM products WHERE id = :id');
        return $stmt->execute(['id' => $id]);
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
}


