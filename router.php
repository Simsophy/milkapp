<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');          // Never leak HTML into responses
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/router.log');

// Start session to check authentication
session_start();

// Router for PHP built-in server
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
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

// 3. Route handling for SPA routes
$isAuthenticated = isset($_SESSION['user']) && !empty($_SESSION['user']);
$userRole = $_SESSION['user']['role'] ?? null;

// Check for admin manage page
if ($path === '/admin/manage') {
    // Only sellers can access
    if (!$isAuthenticated || $userRole !== 'seller') {
        require __DIR__ . '/frontend/login.html';
        exit;
    }
    
    file_put_contents(__DIR__ . '/router.log', "  Admin manage route: serving admin-manage.html\n", FILE_APPEND);
    require __DIR__ . '/frontend/admin-manage.html';
    exit;
}

// Check for create new product page
if ($path === '/admin/create-newproduct') {
    // Only sellers can access
    if (!$isAuthenticated || $userRole !== 'seller') {
        require __DIR__ . '/frontend/login.html';
        exit;
    }
    
    file_put_contents(__DIR__ . '/router.log', "  Create product route: serving create-newproduct.html\n", FILE_APPEND);
    require __DIR__ . '/frontend/Admin/create-newproduct.html';
    exit;
}

// Check for user routes (for buyers)
if ($path === '/user' || strpos($path, '/user') === 0) {
    if (!$isAuthenticated) {
        require __DIR__ . '/frontend/login.html';
        exit;
    }
    
    // Serve user-specific pages
    if ($path === '/user' || $path === '/user/') {
        file_put_contents(__DIR__ . '/router.log', "  User route: serving User/index.html\n", FILE_APPEND);
        require __DIR__ . '/frontend/User/index.html';
        exit;
    }
    if ($path === '/user/delivery') {
        file_put_contents(__DIR__ . '/router.log', "  User route: serving User/delivery.html\n", FILE_APPEND);
        require __DIR__ . '/frontend/User/delivery.html';
        exit;
    }
    if ($path === '/user/pos') {
        file_put_contents(__DIR__ . '/router.log', "  User route: serving User/pos.html\n", FILE_APPEND);
        require __DIR__ . '/frontend/User/pos.html';
        exit;
    }
    
    // Default user page
    file_put_contents(__DIR__ . '/router.log', "  User route: fallback to User/index.html\n", FILE_APPEND);
    require __DIR__ . '/frontend/User/index.html';
    exit;
}

// Check for admin/seller protected routes
if (in_array($path, ['/admin', '/dashboard', '/inventory', '/pos', '/delivery', '/admin/create-newproduct']) || 
    strpos($path, '/admin') === 0 ||
    strpos($path, '/dashboard') === 0 ||
    strpos($path, '/inventory') === 0 ||
    strpos($path, '/pos') === 0 ||
    strpos($path, '/delivery') === 0) {
    
    // If not authenticated, redirect to login
    if (!$isAuthenticated) {
        require __DIR__ . '/frontend/login.html';
        exit;
    }
    
    // Only sellers can access admin routes
    if ($userRole !== 'seller') {
        file_put_contents(__DIR__ . '/router.log', "  Admin route: user is not seller, redirecting to user page\n", FILE_APPEND);
        require __DIR__ . '/frontend/User/index.html';
        exit;
    }
    
    // If authenticated seller, serve dashboard
    file_put_contents(__DIR__ . '/router.log', "  Protected route: serving dashboard.html\n", FILE_APPEND);
    require __DIR__ . '/frontend/Admin/dashboard.html';
    exit;
}

// 4. All other routes -> serve login page (SPA entry point) or root
if ($path === '/' || $path === '') {
    // For root, route based on role
    if ($isAuthenticated) {
        // If admin/seller, serve dashboard.html
        if ($userRole === 'seller') {
            file_put_contents(__DIR__ . '/router.log', "  Root path: seller role, serving dashboard.html\n", FILE_APPEND);
            require __DIR__ . '/frontend/Admin/dashboard.html';
            exit;
        } else {
            // Regular user, serve index.html
            file_put_contents(__DIR__ . '/router.log', "  Root path: user role, serving index.html\n", FILE_APPEND);
            require __DIR__ . '/frontend/index.html';
            exit;
        }
    } else {
        file_put_contents(__DIR__ . '/router.log', "  Root path: not authenticated, serving login.html\n", FILE_APPEND);
        require __DIR__ . '/frontend/login.html';
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
