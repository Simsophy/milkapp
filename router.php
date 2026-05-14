<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');          // Never leak HTML into responses
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/router.log');

// Start session to check authentication
session_start();

// Router for PHP built-in server
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = strtolower($path); // Convert to lowercase for case-insensitive routing
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

file_put_contents(__DIR__ . '/router.log', date('c') . " - Request: $method $path (user: " . ($_SESSION['user']['username'] ?? 'none') . ")\n", FILE_APPEND);

// 1. API routes: /routes/* -> backend/routes/*
if (strpos($path, '/routes/') === 0) {
    $apiFile = __DIR__ . '/backend' . $path;
    file_put_contents(__DIR__ . '/router.log', "  API route: checking $apiFile (exists: " . (is_file($apiFile) ? 'yes' : 'no') . ")\n", FILE_APPEND);
   if (is_file($apiFile)) {
    file_put_contents(__DIR__ . '/router.log', "  Requiring $apiFile\n", FILE_APPEND);
    chdir(dirname($apiFile));          // ← set CWD to api.php's directory
    $_SERVER['SCRIPT_FILENAME'] = $apiFile;  // ← fix __FILE__ context for included files
    require $apiFile;
    exit;
}
    http_response_code(404);
    echo "API endpoint not found: $path";
    exit;
}

// 2. Serve static files from frontend directory with proper MIME types
$frontendFile = __DIR__ . '/frontend' . $path;
if (is_file($frontendFile)) {
    $ext = strtolower(pathinfo($frontendFile, PATHINFO_EXTENSION));
    $mimeTypes = [
        'html' => 'text/html',
        'htm' => 'text/html',
        'js' => 'application/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject',
        'otf' => 'font/otf',
    ];
    $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    // Optional: add caching headers
    // header('Cache-Control: public, max-age=86400');
    readfile($frontendFile);
    exit;
}

// Authentication variables
$isAuthenticated = isset($_SESSION['user']);
$userRole = $_SESSION['user']['role'] ?? 'guest';

// Helper function to check admin access
$isAdmin = $isAuthenticated && in_array($userRole, ['admin', 'seller']);

// 3. Route handling for SPA routes

// Login page - Redirect to dashboard if already logged in
if ($path === '/login' || $path === '/login.html') {
    if ($isAuthenticated) {
        if ($isAdmin) { header('Location: /admin'); exit; }
        else { header('Location: /'); exit; }
    }
    require __DIR__ . '/frontend/login.html';
    exit;
}

// Check for admin dashboard
if ($path === '/admin/dashboard' || $path === '/admin') {
    if (!$isAdmin) { 
        header('Location: /login'); 
        exit; 
    }
    require __DIR__ . '/frontend/Admin/dashboard.html';
    exit;
}

// Check for user dashboard
if ($path === '/user' || $path === '/index.html') {
    require __DIR__ . '/frontend/User/index.html';
    exit;
}

// Check for admin manage product
if ($path === '/admin/manage-product') {
    if (!$isAdmin) { header('Location: /login'); exit; }
    require __DIR__ . '/frontend/Admin/manage-product.html';
    exit;
}

// Check for admin inventory
if ($path === '/admin/inventory') {
    if (!$isAdmin) { header('Location: /login'); exit; }
    require __DIR__ . '/frontend/Admin/inventory-dashboard.html';
    exit;
}

// Check for admin delivery
if ($path === '/admin/delivery') {
    if (!$isAdmin) { header('Location: /login'); exit; }
    require __DIR__ . '/frontend/Admin/delivery-management.html';
    exit;
}

// Check for other admin/seller protected routes
if (strpos($path, '/admin/') === 0) {
    if (!$isAdmin) {
        header('Location: /login');
        exit;
    }
    // Default to dashboard for general /admin/ routes if not handled above
    require __DIR__ . '/frontend/Admin/dashboard.html';
    exit;
}

// 4. All other routes -> serve login page (SPA entry point) or root
if ($path === '/' || $path === '') {
    // For root, route based on authentication and role
    if ($isAuthenticated) {
        // If admin/seller, serve dashboard.html
        if ($isAdmin) {
            require __DIR__ . '/frontend/Admin/dashboard.html';
            exit;
        } else {
            // Authenticated regular user, serve user index
            require __DIR__ . '/frontend/User/index.html';
            exit;
        }
    } else {
        // Not authenticated - show user home page (index.html)
        require __DIR__ . '/frontend/User/index.html';
        exit;
    }
}

// 5. Default fallback to login page
$login = __DIR__ . '/frontend/login.html';
if (is_file($login)) {
    require $login;
    exit;
}

// 6. 404 fallback
http_response_code(404);
echo "404 - File not found";
