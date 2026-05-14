<?php
require 'backend/config/db.php';
echo "Connection successful!\n";
$tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables: " . implode(', ', $tables) . "\n";
foreach ($tables as $table) {
    $columns = $db->query("DESCRIBE $table")->fetchAll(PDO::FETCH_COLUMN);
    echo "Table $table columns: " . implode(', ', $columns) . "\n";
}
