<?php
class TaskController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function getProducts() {
        try {
            $stmt = $this->db->query("SELECT * FROM products ORDER BY id DESC");
            $products = $stmt->fetchAll();
            return ['success' => true, 'products' => $products];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch products: ' . $e->getMessage()];
        }
    }
    
    public function createProduct($data) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO products (name, price, stock, description) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'],
                $data['price'],
                $data['stock'] ?? 0,
                $data['description'] ?? null
            ]);
            
            return ['success' => true, 'message' => 'Product created successfully', 'id' => $this->db->lastInsertId()];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to create product: ' . $e->getMessage()];
        }
    }
    
    public function updateProduct($data) {
        try {
            $stmt = $this->db->prepare("
                UPDATE products 
                SET name = ?, price = ?, stock = ?, description = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['price'],
                $data['stock'] ?? 0,
                $data['description'] ?? null,
                $data['id']
            ]);
            
            return ['success' => true, 'message' => 'Product updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()];
        }
    }
    
    public function getSales() {
        try {
            $stmt = $this->db->query("
                SELECT s.*, p.name as product_name 
                FROM sales s 
                LEFT JOIN products p ON s.product_id = p.id 
                ORDER BY s.sale_date DESC
            ");
            $sales = $stmt->fetchAll();
            return ['success' => true, 'sales' => $sales];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch sales: ' . $e->getMessage()];
        }
    }
    
    public function createSale($data) {
        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("
                INSERT INTO sales (product_id, quantity, total_price, sale_date) 
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([
                $data['product_id'],
                $data['quantity'],
                $data['total_price']
            ]);
            
            // Update stock
            $updateStock = $this->db->prepare("
                UPDATE products 
                SET stock = stock - ? 
                WHERE id = ?
            ");
            $updateStock->execute([$data['quantity'], $data['product_id']]);
            
            $this->db->commit();
            
            return ['success' => true, 'message' => 'Sale recorded successfully'];
        } catch (PDOException $e) {
            $this->db->rollBack();
            return ['success' => false, 'message' => 'Failed to record sale: ' . $e->getMessage()];
        }
    }
}
?>