<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

function handleSettings(string $method): void {
    $db = getDB();

    if ($method === 'GET') {
        $stmt     = $db->query('SELECT * FROM settings LIMIT 1');
        $settings = $stmt->fetch();
        if (!$settings) {
            $settings = [
                'company_name'    => 'NKV — Bombay Lemon Traders',
                'phone'           => '9876543210',
                'address'         => 'Anantapur',
                'commission_rate' => 100,
                'cooli_per_bag'   => 0,
                'chariti_per_bag' => 0,
            ];
        }
        echo json_encode($settings);
        return;
    }

    if ($method === 'PUT') {
        requireAuth();
        $body     = json_decode(file_get_contents('php://input'), true);
        $stmt     = $db->query('SELECT id FROM settings LIMIT 1');
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $db->prepare('
                UPDATE settings
                SET company_name    = ?,
                    phone           = ?,
                    address         = ?,
                    commission_rate = ?,
                    cooli_per_bag   = ?,
                    chariti_per_bag = ?
                WHERE id = ?
            ');
            $stmt->execute([
                $body['company_name']    ?? '',
                $body['phone']           ?? '',
                $body['address']         ?? '',
                $body['commission_rate'] ?? 100,
                $body['cooli_per_bag']   ?? 0,
                $body['chariti_per_bag'] ?? 0,
                $existing['id'],
            ]);
        } else {
            $stmt = $db->prepare('
                INSERT INTO settings
                    (company_name, phone, address, commission_rate, cooli_per_bag, chariti_per_bag)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $body['company_name']    ?? '',
                $body['phone']           ?? '',
                $body['address']         ?? '',
                $body['commission_rate'] ?? 100,
                $body['cooli_per_bag']   ?? 0,
                $body['chariti_per_bag'] ?? 0,
            ]);
        }

        $stmt = $db->query('SELECT * FROM settings LIMIT 1');
        echo json_encode($stmt->fetch());
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}