<?php
require 'backend/config/db.php';
require 'backend/app/Http/Controllers/productController.php';
$c = new ProductController($db);
echo json_encode($c->getAll(), JSON_PRETTY_PRINT);
