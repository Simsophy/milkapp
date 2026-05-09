<?php
require_once __DIR__ . '/config/Database.php';

try {
    $database = new Database();
    $db = $database->connect();
    echo "Database connection successful!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}