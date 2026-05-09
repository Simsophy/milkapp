<?php
class AuthController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function register($data) {
        // Check if user already exists
        $checkStmt = $this->db->prepare("SELECT id FROM users WHERE username = ?");
        $checkStmt->execute([$data['username']]);
        
        if ($checkStmt->fetch()) {
            return ['success' => false, 'message' => 'Username already exists'];
        }
        
        // Hash password
        $password = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Prepare user data
        $role = $data['role'] ?? 'customer';
        $email = $data['email'] ?? null;
        $phone = $data['phone'] ?? null;
        $apiSecret = $data['api_secret'] ?? null;
       
        
        // Insert user
        $stmt = $this->db->prepare("
            INSERT INTO users (username, password, email, phone, role, api_secret) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        try {
            $stmt->execute([$data['username'], $password, $email, $phone, $role, $apiSecret]);
            $userId = $this->db->lastInsertId();
            
            // Auto-login after registration
            $_SESSION['user'] = [
                'id' => $userId,
                'username' => $data['username'],
                'role' => $role,
                'email' => $email,
                'password' => $password,
                'phone' => $phone
            ];
            
            return [
                'success' => true, 
                'message' => 'Registration successful',
                'user' => $_SESSION['user']
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
        }
    }
    
    public function login($data) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($data['password'], $user['password'])) {
            $_SESSION['user'] = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'email' => $user['email'],
                'password'=> password_hash($data['password'], PASSWORD_DEFAULT),
                'phone' => $user['phone']
            ];
            
            return [
                'success' => true,
                'message' => 'Login successful',
                'user' => $_SESSION['user']
            ];
        }
        
        return ['success' => false, 'message' => 'Invalid username or password'];
    }
    
    public function logout() {
        session_destroy();
        return ['success' => true, 'message' => 'Logged out successfully'];
    }
    
    // Admin: Get all users
    public function getAllUsers() {
        // Check if user is admin
        $user = $_SESSION['user'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'seller')) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }
        
        $stmt = $this->db->prepare("
            SELECT id, username, email, phone, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        return ['success' => true, 'users' => $users];
    }
    
    // Admin: Update user role
    public function updateUserRole($data) {
        // Check if user is admin
        $user = $_SESSION['user'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'seller')) {
            return ['success' => false, 'message' => 'Unauthorized'];
        }
        
        $userId = $data['user_id'] ?? null;
        $newRole = $data['role'] ?? null;
        
        if (!$userId || !$newRole) {
            return ['success' => false, 'message' => 'Missing user_id or role'];
        }
        
        if (!in_array($newRole, ['customer', 'seller', 'admin'])) {
            return ['success' => false, 'message' => 'Invalid role'];
        }
        
        try {
            $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE id = ?");
            $stmt->execute([$newRole, $userId]);
            
            return ['success' => true, 'message' => 'User role updated successfully'];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Failed to update user role: ' . $e->getMessage()];
        }
    }
}
?>