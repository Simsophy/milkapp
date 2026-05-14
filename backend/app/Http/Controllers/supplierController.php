<?php
class SupplierController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function getAll() {
        try {
            $stmt = $this->db->query("SELECT * FROM suppliers ORDER BY name ASC");
            $suppliers = $stmt->fetchAll();
            return ['success' => true, 'data' => $suppliers];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch suppliers: ' . $e->getMessage()];
        }
    }
}
