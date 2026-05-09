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
                ORDER BY created_at DESC
            ");
            $stmt->execute();
            $products = $stmt->fetchAll();
            
            return ['success' => true, 'products' => $products];
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
            
            return ['success' => true, 'product' => $product];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch product: ' . $e->getMessage()];
        }
    }
    
    // Admin: Create/Upload new product
    public function create($data) {
     

    $user = $_SESSION['user'] ?? null;

    if (!$user || !in_array($user['role'], ['admin', 'seller'])) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }

    $name = $data['name'] ?? '';
    $description = $data['description'] ?? '';
    $price = $data['price'] ?? 0;
    $category = $data['category'] ?? 'general';
    $stock = $data['stock'] ?? 0;
    $imageUrl = $data['image_url'] ?? '';

    if ($name === '' || $price <= 0) {
        return ['success' => false, 'message' => 'Invalid name or price'];
    }

    try {
        $stmt = $this->db->prepare("
            INSERT INTO products (name, description, price, category, stock, image_url, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $name,
            $description,
            $price,
            $category,
            $stock,
            $imageUrl,
            $user['id'] ?? null
        ]);

        return ['success' => true, 'message' => 'Product created'];
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'DB Error: ' . $e->getMessage()
        ];
    }
}
    // Admin: Update product
    public function update($data) {
        // Check if user is admin or seller
        $user = $_SESSION['user'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'seller')) {
            return ['success' => false, 'message' => 'Unauthorized: Only admins can update products'];
        }
        
        $productId = $data['id'] ?? null;
        
        if (!$productId) {
            return ['success' => false, 'message' => 'Product ID is required'];
        }
        
        try {
            // Build dynamic update query
            $updates = [];
            $params = [];
            
            if (isset($data['name'])) {
                $updates[] = "name = ?";
                $params[] = $data['name'];
            }
            if (isset($data['description'])) {
                $updates[] = "description = ?";
                $params[] = $data['description'];
            }
            if (isset($data['price'])) {
                $updates[] = "price = ?";
                $params[] = $data['price'];
            }
            if (isset($data['category'])) {
                $updates[] = "category = ?";
                $params[] = $data['category'];
            }
            if (isset($data['stock'])) {
                $updates[] = "stock = ?";
                $params[] = $data['stock'];
            }
            if (isset($data['image_url'])) {
                $updates[] = "image_url = ?";
                $params[] = $data['image_url'];
            }
            
            if (empty($updates)) {
                return ['success' => false, 'message' => 'No fields to update'];
            }
            
            $params[] = $productId;
            
            $query = "UPDATE products SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            
            return ['success' => true, 'message' => 'Product updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()];
        }
    }
    
    // Admin: Delete product
    public function delete($productId) {
        // Check if user is admin or seller
        $user = $_SESSION['user'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'seller')) {
            return ['success' => false, 'message' => 'Unauthorized: Only admins can delete products'];
        }
        
        try {
            $stmt = $this->db->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            
            return ['success' => true, 'message' => 'Product deleted successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to delete product: ' . $e->getMessage()];
        }
    }
    
    // Admin: Update stock
    public function updateStock($data) {
        // Check if user is admin or seller
        $user = $_SESSION['user'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'seller')) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }
        
        $productId = $data['id'] ?? null;
        $quantity = $data['quantity'] ?? null;
        
        if (!$productId || $quantity === null) {
            return ['success' => false, 'message' => 'Product ID and quantity are required'];
        }
        
        try {
            $stmt = $this->db->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            $stmt->execute([$quantity, $productId]);
            
            return ['success' => true, 'message' => 'Stock updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update stock: ' . $e->getMessage()];
        }
    }
}
?>
