<?php
declare(strict_types=1);

class SupplierController
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    /**
     * Get all suppliers
     */
    public function getSuppliers(): array
    {
        $stmt = $this->conn->query('SELECT * FROM suppliers ORDER BY name ASC');
        $suppliers = $stmt->fetchAll();

        return [
            'success' => true,
            'data' => $suppliers,
        ];
    }

    /**
     * Get supplier by ID
     */
    public function getSupplierById(array $payload): array
    {
        $supplierId = (int) ($payload['supplier_id'] ?? 0);

        if ($supplierId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid supplier ID.',
            ];
        }

        $stmt = $this->conn->prepare('SELECT * FROM suppliers WHERE id = :id');
        $stmt->execute(['id' => $supplierId]);
        $supplier = $stmt->fetch();

        if (!$supplier) {
            return [
                'success' => false,
                'message' => 'Supplier not found.',
            ];
        }

        return [
            'success' => true,
            'data' => $supplier,
        ];
    }

    /**
     * Create new supplier
     */
    public function createSupplier(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $contactPerson = isset($payload['contact_person']) ? trim((string) $payload['contact_person']) : null;
        $phone = isset($payload['phone']) ? trim((string) $payload['phone']) : null;
        $email = isset($payload['email']) ? trim((string) $payload['email']) : null;
        $address = isset($payload['address']) ? trim((string) $payload['address']) : null;

        if ($name === '') {
            return [
                'success' => false,
                'message' => 'Supplier name is required.',
            ];
        }

        try {
            $stmt = $this->conn->prepare(
                'INSERT INTO suppliers (name, contact_person, phone, email, address) 
                 VALUES (:name, :contact_person, :phone, :email, :address)'
            );

            $stmt->execute([
                'name' => $name,
                'contact_person' => $contactPerson,
                'phone' => $phone,
                'email' => $email,
                'address' => $address,
            ]);

            $supplierId = (int) $this->conn->lastInsertId();

            return [
                'success' => true,
                'message' => 'Supplier created successfully.',
                'supplier_id' => $supplierId,
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create supplier.',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update supplier
     */
    public function updateSupplier(array $payload): array
    {
        $supplierId = (int) ($payload['supplier_id'] ?? 0);

        if ($supplierId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid supplier ID.',
            ];
        }

        // Check if supplier exists
        $stmt = $this->conn->prepare('SELECT id FROM suppliers WHERE id = :id');
        $stmt->execute(['id' => $supplierId]);
        if (!$stmt->fetch()) {
            return [
                'success' => false,
                'message' => 'Supplier not found.',
            ];
        }

        // Build dynamic update query
        $updates = [];
        $params = ['id' => $supplierId];

        $fields = ['name', 'contact_person', 'phone', 'email', 'address'];
        foreach ($fields as $field) {
            if (isset($payload[$field])) {
                $updates[] = "{$field} = :{$field}";
                $params[$field] = trim((string) $payload[$field]);
            }
        }

        if (empty($updates)) {
            return [
                'success' => false,
                'message' => 'No fields to update.',
            ];
        }

        $query = 'UPDATE suppliers SET ' . implode(', ', $updates) . ' WHERE id = :id';

        try {
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            return [
                'success' => true,
                'message' => 'Supplier updated successfully.',
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to update supplier.',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete supplier
     */
    public function deleteSupplier(array $payload): array
    {
        $supplierId = (int) ($payload['supplier_id'] ?? 0);

        if ($supplierId <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid supplier ID.',
            ];
        }

        try {
            $this->conn->beginTransaction();

            // Check if supplier is used as default in any product
            $stmt = $this->conn->prepare(
                'UPDATE product_stock_settings SET default_supplier_id = NULL WHERE default_supplier_id = :id'
            );
            $stmt->execute(['id' => $supplierId]);

            // Delete supplier
            $stmt = $this->conn->prepare('DELETE FROM suppliers WHERE id = :id');
            $deleted = $stmt->execute(['id' => $supplierId]);

            if ($stmt->rowCount() === 0) {
                $this->conn->rollBack();
                return [
                    'success' => false,
                    'message' => 'Supplier not found.',
                ];
            }

            $this->conn->commit();

            return [
                'success' => true,
                'message' => 'Supplier deleted successfully.',
            ];
        } catch (Throwable $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }

            return [
                'success' => false,
                'message' => 'Failed to delete supplier.',
                'error' => $e->getMessage(),
            ];
        }
    }
}
