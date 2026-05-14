<?php
declare(strict_types=1);

session_start();

// Check if user is authenticated
if (isset($_SESSION['user']) && !empty($_SESSION['user'])) {
    $role = $_SESSION['user']['role'] ?? 'user';
    
    // Route based on user role
    if ($role === 'admin' || $role === 'seller') {
        // Admin/Seller goes to dashboard.html
        header('Location: frontend/Admin/dashboard.html');
    } else {
        // Regular user goes to user index.html
        header('Location: frontend/User/index.html');
    }
} else {
    // Not authenticated - go to user home page (no login required for user role)
    header('Location: frontend/User/index.html');
}
exit;