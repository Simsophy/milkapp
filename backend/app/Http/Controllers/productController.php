<?php
class ProductController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // Get all products
    public function getAll() {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, description, price, category, stock, image_url, created_at 
                FROM products 
                ORDER BY id DESC
            ");
            $stmt->execute();
            $products = $stmt->fetchAll();
            
            return ['success' => true, 'data' => $products];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch products: ' . $e->getMessage()];
        }
    }
    
    // Get product by ID
    public function getById($productId) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, description, price, category, stock, image_url, created_at 
                FROM products 
                WHERE id = ?
            ");
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            
            if (!$product) {
                return ['success' => false, 'message' => 'Product not found'];
            }
            
            return ['success' => true, 'data' => $product];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch product: ' . $e->getMessage()];
        }
    }
    
    // Create new product
    public function create($data) {
        $name = $data['name'] ?? '';
        $description = $data['description'] ?? '';
        $price = $data['price'] ?? 0;
        $category = $data['category'] ?? 'general';
        $stock = $data['stock'] ?? 0;
        $image = $data['image'] ?? '';

        if ($name === '' || $price <= 0) {
            return ['success' => false, 'message' => 'Invalid name or price'];
        }

        try {
            $stmt = $this->db->prepare("
                INSERT INTO products (name, description, price, category, stock, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([$name, $description, $price, $category, $stock, $image]);
            $productId = (int)$this->db->lastInsertId();

            // Log initial stock as IN transaction
            if ($stock > 0) {
                $invStmt = $this->db->prepare("INSERT INTO inventory (product_id, quantity, type, notes) VALUES (?, ?, ?, ?)");
                $invStmt->execute([$productId, $stock, 'IN', 'Initial stock on creation']);
            }

            return [
                'success' => true,
                'message' => 'Product created successfully',
                'data' => ['id' => $productId]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }

    // Update product
    public function update($data) {
        $productId = $data['id'] ?? null;
        if (!$productId) return ['success' => false, 'message' => 'Product ID is required'];
        
        $name = $data['name'] ?? '';
        $description = $data['description'] ?? '';
        $price = $data['price'] ?? 0;
        $category = $data['category'] ?? '';
        $stock = $data['stock'] ?? 0;
        $image = $data['image'] ?? '';

        try {
            // Get current stock before update to calculate difference
            $stmtBefore = $this->db->prepare("SELECT stock FROM products WHERE id = ?");
            $stmtBefore->execute([$productId]);
            $oldStock = (int)$stmtBefore->fetchColumn();

            $stmt = $this->db->prepare("
                UPDATE products 
                SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?
                WHERE id = ?
            ");
            $stmt->execute([$name, $description, $price, $category, $stock, $image, $productId]);
            
            // Log stock adjustment if changed
            if ($stock != $oldStock) {
                $diff = $stock - $oldStock;
                $type = $diff > 0 ? 'IN' : 'OUT';
                $absDiff = abs($diff);
                $invStmt = $this->db->prepare("INSERT INTO inventory (product_id, quantity, type, notes) VALUES (?, ?, ?, ?)");
                $invStmt->execute([$productId, $absDiff, $type, 'Stock adjustment via product update']);
            }

            return ['success' => true, 'message' => 'Product updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()];
        }
    }
    
    // Delete product
    public function delete($data) {
        try {
            $productId = $data['id'] ?? null;
            if (!$productId) return ['success' => false, 'message' => 'Product ID is required'];
            
            $stmt = $this->db->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            
            return ['success' => true, 'message' => 'Product deleted successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete product: ' . $e->getMessage()];
        }
    }
    
    // Update stock
    public function updateStock($data) {
        $productId = $data['id'] ?? null;
        $quantity = $data['quantity'] ?? 0;
        $type = $data['type'] ?? 'IN'; // IN or OUT
        
        if (!$productId) return ['success' => false, 'message' => 'Product ID is required'];
        
        try {
            $this->db->beginTransaction();
            
            $op = ($type === 'IN') ? '+' : '-';
            $stmt = $this->db->prepare("UPDATE products SET stock = stock $op ? WHERE id = ?");
            $stmt->execute([$quantity, $productId]);
            
            // Log inventory
            $stmt = $this->db->prepare("INSERT INTO inventory (product_id, quantity, type, notes) VALUES (?, ?, ?, ?)");
            $stmt->execute([$productId, $quantity, $type, 'Manual Adjustment']);
            
            $this->db->commit();
            return ['success' => true, 'message' => 'Stock updated successfully'];
        } catch (PDOException $e) {
            $this->db->rollBack();
            return ['success' => false, 'message' => 'Failed to update stock: ' . $e->getMessage()];
        }
    }
}
?>
