<?php
// backend/controllers/AuthController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

function handleLogin(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $username = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');

    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password required']);
        return;
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
        return;
    }

    $token = jwtEncode(['user_id' => $user['id'], 'username' => $user['username']]);
    echo json_encode(['token' => $token, 'username' => $user['username']]);
}

function handleChangePassword(): void {
    requireAuth();

    $payload = getAuthPayload();   // decoded JWT — we need user_id from it
    $userId  = $payload['user_id'] ?? null;

    if (!$userId) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    $body = json_decode(file_get_contents('php://input'), true);

    $currentPassword = trim($body['current_password'] ?? '');
    $newUsername     = trim($body['new_username']     ?? '');
    $newPassword     = trim($body['new_password']     ?? '');
    $confirmPassword = trim($body['confirm_password'] ?? '');

    if (!$currentPassword) {
        http_response_code(400);
        echo json_encode(['error' => 'Current password is required']);
        return;
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($currentPassword, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Current password is incorrect']);
        return;
    }

    // At least one of username or password must be changing
    if (!$newUsername && !$newPassword) {
        http_response_code(400);
        echo json_encode(['error' => 'Provide a new username or new password to update']);
        return;
    }

    // Validate new password if provided
    if ($newPassword) {
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'New password must be at least 6 characters']);
            return;
        }
        if ($newPassword !== $confirmPassword) {
            http_response_code(400);
            echo json_encode(['error' => 'New password and confirm password do not match']);
            return;
        }
    }

    // Check new username uniqueness (if changing)
    $finalUsername = $newUsername ?: $user['username'];
    if ($newUsername && $newUsername !== $user['username']) {
        $check = $db->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
        $check->execute([$newUsername, $userId]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'That username is already taken']);
            return;
        }
    }

    // Build update
    $finalHash = $newPassword
        ? password_hash($newPassword, PASSWORD_BCRYPT)
        : $user['password'];

    $update = $db->prepare('UPDATE users SET username = ?, password = ? WHERE id = ?');
    $update->execute([$finalUsername, $finalHash, $userId]);

    // Issue a fresh token with updated username
    $token = jwtEncode(['user_id' => $userId, 'username' => $finalUsername]);
    echo json_encode([
        'success'  => true,
        'token'    => $token,
        'username' => $finalUsername,
        'message'  => 'Credentials updated successfully',
    ]);
}