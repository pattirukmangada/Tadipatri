<?php
// backend/public/index.php — Main API Router

header('Access-Control-Allow-Origin: https://nkvlemons.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../controllers/LedgerController.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query  = $_GET;

$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/') ?: '/';

$segments = explode('/', ltrim($uri, '/'));
$resource = $segments[0] ?? '';
$id       = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
$sub      = $segments[1] ?? '';
$action   = $segments[2] ?? '';   // e.g. "paid" in /bills/123/paid

try {
    match(true) {
        // ── Auth ─────────────────────────────────────────────────────────────
        $uri === '/auth/login' && $method === 'POST' => (function() {
            require_once __DIR__ . '/../controllers/AuthController.php';
            handleLogin();
        })(),

        $uri === '/auth/change-password' && $method === 'PUT' => (function() {
            require_once __DIR__ . '/../controllers/AuthController.php';
            handleChangePassword();
        })(),

        // ── Bills: toggle paid ────────────────────────────────────────────────
        $resource === 'bills' && $id && $action === 'paid' && $method === 'PATCH' => (function() use ($id) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleBillPaidToggle($id);
        })(),
            // ── Bills: toggle printed ────────────────────────────────────────────────    
        $resource === 'bills' && $id && $action === 'printed' && $method === 'PATCH' => (function() use ($id) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleBillPrintedToggle($id);
        })(),

        // ── Bills ─────────────────────────────────────────────────────────────
        $resource === 'bills' && !$id => (function() use ($method, $query) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleBills($method, null, $query);
        })(),
        $resource === 'bills' && $id => (function() use ($method, $id, $query) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleBills($method, (string)$id, $query);
        })(),
        

        // ── Dashboard stats ───────────────────────────────────────────────────
        $resource === 'dashboard' && $sub === 'stats' => (function() use ($query) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleDashboardStats($query);
        })(),

        // ── Buyer purchases ───────────────────────────────────────────────────
        $resource === 'buyers' && $sub === 'purchases' => (function() use ($query) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleBuyerPurchases($query);
        })(),

        // ── Patti purchases ───────────────────────────────────────────────────
        $resource === 'patti' && $sub === 'purchases' => (function() use ($query) {
            require_once __DIR__ . '/../controllers/BillController.php';
            handlePattiPurchases($query);
        })(),

        // ── Top sales (public) ────────────────────────────────────────────────
        $resource === 'sales' && $sub === 'top' => (function() {
            require_once __DIR__ . '/../controllers/BillController.php';
            handleTopSales();
        })(),

        // ── Settings ──────────────────────────────────────────────────────────
        $resource === 'settings' => (function() use ($method) {
            require_once __DIR__ . '/../controllers/SettingsController.php';
            handleSettings($method);
        })(),

        // ── Contacts ──────────────────────────────────────────────────────────
        $resource === 'contacts' => (function() use ($method) {
            require_once __DIR__ . '/../controllers/ContactController.php';
            handleContacts($method);
        })(),

        // ── Profit & Loss ─────────────────────────────────────────────────────
        $resource === 'profit-loss' => (function() use ($method, $id, $query) {
            require_once __DIR__ . '/../controllers/ProfitLossController.php';
            handleProfitLoss($method, $id ? (string)$id : null, $query);
        })(),

        // ── General Ledger ────────────────────────────────────────────────────
        $resource === 'ledger' => (function() use ($method, $id, $query) {
            require_once __DIR__ . '/../controllers/LedgerController.php';
            handleLedger($method, $id ? (string)$id : null, $query);
        })(),

        // ── Buyer Payments ────────────────────────────────────────────────────
        $resource === 'buyer-payments' => (function() use ($method, $id, $query) {
            require_once __DIR__ . '/../controllers/BuyerLedgerController.php';
            handleBuyerPayments($method, $id ? (string)$id : null, $query);
        })(),

        // ── Buyer Ledger ──────────────────────────────────────────────────────
        $resource === 'buyer-ledger' => (function() use ($method, $id, $query) {
            require_once __DIR__ . '/../controllers/BuyerLedgerController.php';
            handleBuyerLedger($method, $id ? (string)$id : null, $query);
        })(),

        // ── Buyer Balance (for print) ─────────────────────────────────────────
        $resource === 'buyer-balance' => (function() use ($query) {
            require_once __DIR__ . '/../controllers/BuyerLedgerController.php';
            handleBuyerBalance($query);
        })(),

        default => (function() use ($uri) {
            http_response_code(404);
            echo json_encode(['error' => "Route not found: $uri"]);
        })(),
    };
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}