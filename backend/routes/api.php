<?php
error_reporting(E_ALL);
 
ini_set('display_errors', 0); // Always disable display_errors to prevent HTML leakage
ini_set('log_errors', 1);

// Catch fatal errors and return JSON
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        echo json_encode([
            'success' => false,
            'message' => 'Server error: ' . $err['message'],
            'file'    => basename($err['file']),
            'line'    => $err['line'],
        ]);
    }
});

set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'message' => 'Exception: ' . $e->getMessage(),
        'file'    => basename($e->getFile()),
        'line'    => $e->getLine(),
    ]);
    exit;
});

// Convert PHP warnings/notices to exceptions so they return JSON instead of HTML
set_error_handler(function ($severity, $message, $file, $line) {
    // Don't throw for suppressed errors (@)
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Only start session if not already active (router.php may have started it)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include files
require __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../app/Http/Controllers/authController.php';
require_once __DIR__ . '/../app/Http/Controllers/productController.php';
require_once __DIR__ . '/../app/Http/Controllers/adminController.php';
require_once __DIR__ . '/../app/Http/Controllers/inventoryController.php';
require_once __DIR__ . '/../app/Http/Controllers/supplierController.php';
require_once __DIR__ . '/../app/Http/Controllers/posController.php';


// taskController might not exist yet, so safely include if available
if (file_exists(__DIR__ . '/../app/Http/Controllers/taskController.php')) {
    require_once __DIR__ . '/../app/Http/Controllers/taskController.php';
}

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize controllers
$authController = new AuthController($db);
$productController = new ProductController($db);
$posController = new POSController($db);
$adminController = new AdminController($db);
$inventoryController = new InventoryController($db);
$supplierController = new SupplierController($db);
$taskController = class_exists('TaskController') ? new TaskController($db) : null;

// Route handling
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function requestBody() {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

$payload = requestBody();

switch ($action) {
    case 'register':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($authController->register($payload));
        break;
        
    case 'login':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($authController->login($payload));
        break;
        
    case 'logout':
        jsonResponse($authController->logout());
        break;
        
    case 'me':
        $user = $_SESSION['user'] ?? null;
        jsonResponse(['success'=>!!$user, 'user'=>$user]);
        break;
    
    // ===== USER MANAGEMENT (Admin only) =====
    case 'users':
        if ($method !== 'GET') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($authController->getAllUsers());
        break;
    
    case 'update-user-role':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($authController->updateUserRole($payload));
        break;
    
    // ===== PRODUCT MANAGEMENT =====
    case 'products':
        if ($method === 'GET') {
            jsonResponse($productController->getAll());
        } elseif ($method === 'POST') {
            // Create new product
            jsonResponse($productController->create($payload));
        } else {
            jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        }
        break;
  // ===== PRODUCT MANAGEMENT =====
    case 'product':
        $productId = $_GET['id'] ?? null;
        if ($method === 'GET') {
            if ($productId) {
                jsonResponse($productController->getById($productId));
            } else {
                jsonResponse($productController->getAll());
            }
        } elseif ($method === 'POST') {
            $user = $_SESSION['user'] ?? null;
            if (!$user || !in_array($user['role'], ['admin', 'seller'])) {
                jsonResponse(['success' => false, 'message' => 'Forbidden: Admin access required'], 403);
            }
            jsonResponse($productController->create($payload));
        } elseif ($method === 'PUT') {
            $user = $_SESSION['user'] ?? null;
            if (!$user || !in_array($user['role'], ['admin', 'seller'])) {
                jsonResponse(['success' => false, 'message' => 'Forbidden: Admin access required'], 403);
            }
            $payload['id'] = $productId;
            jsonResponse($productController->update($payload));
        } elseif ($method === 'DELETE') {
            $user = $_SESSION['user'] ?? null;
            if (!$user || !in_array($user['role'], ['admin', 'seller'])) {
                jsonResponse(['success' => false, 'message' => 'Forbidden: Admin access required'], 403);
            }
            jsonResponse($productController->delete(['id' => $productId]));
        } else {
            jsonResponse(['success'=>false,'message'=>'Method not allowed'], 405);
        }
        break;
    case 'update-stock':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($productController->updateStock($payload));
        break;

    // ===== POS OPERATIONS =====
    case 'get-cart':
        jsonResponse($posController->getCart());
        break;
    
    case 'add-to-cart':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->addToCart($payload));
        break;
    
    case 'update-cart-item':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->updateCartItem($payload));
        break;
    
    case 'remove-from-cart':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->removeFromCart($payload));
        break;
    
    case 'clear-cart':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->clearCart());
        break;
    
    case 'create-order':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->createOrder($payload));
        break;
    
    case 'get-orders':
        jsonResponse($posController->getOrders());
        break;
    
    case 'get-order':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->getOrderById($payload));
        break;
    
    case 'update-order-status':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($posController->updateOrderStatus($payload));
        break;
        
    // ===== INVENTORY MANAGEMENT =====
    case 'inventory':
        jsonResponse($inventoryController->getInventory());
        break;
    
    case 'stock-alerts':
        jsonResponse($inventoryController->checkStockAlerts());
        break;
        
    case 'stock-in':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($inventoryController->stockIn($payload));
        break;
        
    case 'stock-out':
        if ($method !== 'POST') jsonResponse(['success'=>false,'message'=>'Method not allowed'],405);
        jsonResponse($inventoryController->stockOut($payload));
        break;
        
    case 'stock-logs':
        jsonResponse($inventoryController->getStockLogs($payload));
        break;
        
    case 'suppliers':
        jsonResponse($supplierController->getAll());
        break;
        
    case 'dashboard-stats':
        $user = $_SESSION['user'] ?? null;
        if (!$user || !in_array($user['role'], ['admin', 'seller'])) {
            jsonResponse(['success'=>false,'message'=>'Forbidden: Admin/Seller access required'],403);
        }
        jsonResponse($adminController->getDashboardStats());
        break;
        
    default:
        jsonResponse([
            'success'=>false,
            'message'=>'Unknown action',
            'available_actions'=>[
                'register','login','logout','me',
                'users','update-user-role',
                'products','product','update-stock',
                'get-cart','add-to-cart','update-cart-item','remove-from-cart','clear-cart',
                'create-order','get-orders','get-order','update-order-status'
            ]
        ], 400);
        break;
}
?>
