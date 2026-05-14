<?php
class AdminController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // Get dashboard statistics
    public function getDashboardStats() {
        try {
            // Total Orders
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM orders");
            $totalOrders = $stmt->fetch()['total'] ?? 0;
            
            // Total Revenue
            $stmt = $this->db->query("SELECT SUM(total_revenue) as total FROM orders WHERE status != 'cancelled'");
            $totalRevenue = $stmt->fetch()['total'] ?? 0;
            
            // Total Products
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM products");
            $totalProducts = $stmt->fetch()['total'] ?? 0;
            
            // Total Deliveries (Completed)
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM orders WHERE delivery_status = 'delivered'");
            $totalDeliveries = $stmt->fetch()['total'] ?? 0;
            
            // Low Stock Count (less than 10)
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM products WHERE stock < 10");
            $lowStockCount = $stmt->fetch()['total'] ?? 0;
            
            // Pending Orders
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM orders WHERE status = 'pending'");
            $pendingOrders = $stmt->fetch()['total'] ?? 0;
            
            // Completed Orders
            $stmt = $this->db->query("SELECT COUNT(*) as total FROM orders WHERE status = 'completed' OR delivery_status = 'delivered'");
            $completedOrders = $stmt->fetch()['total'] ?? 0;
            
            // Recent Orders (last 5)
            $stmt = $this->db->query("
                SELECT o.id, o.user_id, o.total_revenue as total, o.status, o.delivery_status, o.created_at, u.username as customer_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT 5
            ");
            $recentOrders = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => [
                    'totalOrders' => (int)$totalOrders,
                    'totalRevenue' => (float)$totalRevenue,
                    'totalProducts' => (int)$totalProducts,
                    'totalDeliveries' => (int)$totalDeliveries,
                    'lowStockCount' => (int)$lowStockCount,
                    'pendingOrders' => (int)$pendingOrders,
                    'completedOrders' => (int)$completedOrders,
                    'recentOrders' => $recentOrders
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to fetch dashboard stats: ' . $e->getMessage()];
        }
    }
}
