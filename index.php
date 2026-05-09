<?php
declare(strict_types=1);

session_start();

// Check if user is authenticated
if (isset($_SESSION['user']) && !empty($_SESSION['user'])) {
    $role = $_SESSION['user']['role'] ?? 'user';
    
    // Route based on user role
    if ($role === 'admin' || $role === 'seller') {
        // Admin goes to dashboard.html
        header('Location: frontend/dashboard.html');
    } else {
        // Regular user goes to index.html
        header('Location: frontend/index.html');
    }
} else {
    // Not authenticated, go to login
    header('Location: frontend/login.html');
}
exit;