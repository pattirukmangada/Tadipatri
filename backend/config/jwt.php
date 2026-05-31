<?php
// backend/config/jwt.php
// ✏️ CHANGE JWT_SECRET to a long random string before deploying!

define('JWT_SECRET', 'change-this-to-a-very-long-random-secret-key-nkv-2026');
define('JWT_EXPIRY', 86400); // 24 hours in seconds

function jwtEncode(array $payload): string {
    $header         = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['exp'] = time() + JWT_EXPIRY;
    $payload['iat'] = time();
    $payloadEncoded = base64UrlEncode(json_encode($payload));
    $signature      = base64UrlEncode(hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true));
    return "$header.$payloadEncoded.$signature";
}

function jwtDecode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;

    $expectedSig = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $signature)) return null;

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data || (isset($data['exp']) && $data['exp'] < time())) return null;

    return $data;
}

/**
 * Read and decode the Bearer token from the Authorization header.
 * Returns the decoded payload array, or an empty array if missing/invalid.
 * Used by controllers that need the current user_id without going through requireAuth() again.
 */
function getAuthPayload(): array {
    $headers = getallheaders();

    // getallheaders() key casing varies by server — check both
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        return [];
    }

    $decoded = jwtDecode($m[1]);
    return is_array($decoded) ? $decoded : [];
}

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(
        strtr($data, '-_', '+/')
        . str_repeat('=', (4 - strlen($data) % 4) % 4)
    );
}