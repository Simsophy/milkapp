<?php
declare(strict_types=1);

class User
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
    }

    public function findByUsername(string $username): ?array
    {
    $stmt = $this->conn->prepare('
    SELECT id, username, password, email, phone,api_secret, role, created_at
    FROM users 
    WHERE username = :username 
    LIMIT 1
');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->conn->prepare('SELECT id, username, email FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->conn->prepare('SELECT id, username, email, phone,  role, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function create(array $data): bool
    {
        $stmt = $this->conn->prepare('
            INSERT INTO users (username, password, email, phone, api_secret, role)
            VALUES (:username, :password, :email, :phone, :api_secret, :role)
        ');

        return $stmt->execute([
            'username' => $data['username'],
            'password' => $data['password'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
           
            'api_secret' => $data['api_secret'] ?? null,
            'role' => $data['role'] ?? 'customer',
        ]);
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];

        foreach (['email', 'phone'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute($params);
    }
}


