<?php
// backend/middleware/AuthMiddleware.php
require_once __DIR__ . '/../config/jwt.php';

function requireAuth(): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        http_response_code(401);
        die(json_encode(['error' => 'Unauthorized: No token provided']));
    }
    
    $token = substr($authHeader, 7);
    $payload = jwtDecode($token);
    
    if (!$payload) {
        http_response_code(401);
        die(json_encode(['error' => 'Unauthorized: Invalid or expired token']));
    }
    
    return $payload;
}
