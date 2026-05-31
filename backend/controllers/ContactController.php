<?php
// backend/controllers/ContactController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

function handleContacts(string $method): void {
    $db = getDB();

    if ($method === 'GET') {
        requireAuth();
        $stmt = $db->query('SELECT * FROM contacts ORDER BY created_at DESC');
        echo json_encode($stmt->fetchAll());
        return;
    }

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (empty($body['name']) || empty($body['message'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Name and message required']);
            return;
        }
        $stmt = $db->prepare('INSERT INTO contacts (name, email, phone, message) VALUES (?,?,?,?)');
        $stmt->execute([$body['name'], $body['email']??'', $body['phone']??'', $body['message']]);
        http_response_code(201);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
