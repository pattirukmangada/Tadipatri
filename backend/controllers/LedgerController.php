<?php
// backend/controllers/LedgerController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

function handleLedger(string $method, ?string $id, array $query): void {
    requireAuth();
    $db = getDB();

    // ── GET LIST ─────────────────────────────────────────────────────────────
    if ($method === 'GET' && !$id) {
        $conditions = [];
        $params     = [];

        if (!empty($query['from'])) {
            $conditions[] = 'date >= ?';
            $params[]     = $query['from'];
        }

        if (!empty($query['to'])) {
            $conditions[] = 'date <= ?';
            $params[]     = $query['to'];
        }

        if (!empty($query['type'])) {
            $conditions[] = 'type = ?';
            $params[]     = $query['type'];
        }

        // ✅ FIXED AGENT FILTER (Exact match, no case/space issue)
        if (!empty($query['agent'])) {
            $conditions[] = 'TRIM(LOWER(agent)) = TRIM(LOWER(?))';
            $params[]     = $query['agent'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $stmt = $db->prepare("
            SELECT id, date, description, agent, type, amount, created_at
            FROM ledger_entries
            $where
            ORDER BY date ASC, id ASC
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ── TOTALS ──────────────────────────────────────────────────────────
        $totalCredit = 0.0;
        $totalDebit  = 0.0;

        foreach ($rows as $r) {
            if ($r['type'] === 'credit') {
                $totalCredit += (float)$r['amount'];
            } else {
                $totalDebit += (float)$r['amount'];
            }
        }

        // ── CLEAN AGENT LIST (no duplicates / spaces) ───────────────────────
        $agentStmt = $db->query("
            SELECT DISTINCT TRIM(agent) as agent
            FROM ledger_entries
            WHERE agent IS NOT NULL AND TRIM(agent) != ''
            ORDER BY agent ASC
        ");
        $agents = $agentStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'entries'      => $rows,
            'total_credit' => $totalCredit,
            'total_debit'  => $totalDebit,
            'balance'      => $totalCredit - $totalDebit,
            'agents'       => $agents,
        ]);
        return;
    }

    // ── GET SINGLE ───────────────────────────────────────────────────────────
    if ($method === 'GET' && $id) {
        $stmt = $db->prepare('SELECT * FROM ledger_entries WHERE id = ?');
        $stmt->execute([$id]);
        $entry = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$entry) {
            http_response_code(404);
            echo json_encode(['error' => 'Entry not found']);
            return;
        }

        echo json_encode($entry);
        return;
    }

    // ── POST (CREATE) ────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $date        = trim($body['date'] ?? date('Y-m-d'));
        $description = trim($body['description'] ?? '');
        $agent       = trim($body['agent'] ?? '');
        $type        = trim($body['type'] ?? '');
        $amount      = (float)($body['amount'] ?? 0);

        if (!$description) {
            http_response_code(400);
            echo json_encode(['error' => 'Description is required']);
            return;
        }

        if (!in_array($type, ['credit', 'debit'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Type must be credit or debit']);
            return;
        }

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Amount must be greater than zero']);
            return;
        }

        $stmt = $db->prepare('
            INSERT INTO ledger_entries (date, description, agent, type, amount)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$date, $description, $agent, $type, $amount]);

        $newId = $db->lastInsertId();

        $stmt = $db->prepare('SELECT * FROM ledger_entries WHERE id = ?');
        $stmt->execute([$newId]);

        http_response_code(201);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        return;
    }

    // ── PUT (UPDATE) ─────────────────────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $stmt = $db->prepare('SELECT * FROM ledger_entries WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Entry not found']);
            return;
        }

        $body = json_decode(file_get_contents('php://input'), true);

        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $date        = trim($body['date'] ?? $existing['date']);
        $description = trim($body['description'] ?? $existing['description']);
        $agent       = trim($body['agent'] ?? $existing['agent']);
        $type        = trim($body['type'] ?? $existing['type']);
        $amount      = (float)($body['amount'] ?? $existing['amount']);

        if (!$description) {
            http_response_code(400);
            echo json_encode(['error' => 'Description is required']);
            return;
        }

        if (!in_array($type, ['credit', 'debit'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Type must be credit or debit']);
            return;
        }

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Amount must be greater than zero']);
            return;
        }

        $stmt = $db->prepare('
            UPDATE ledger_entries 
            SET date=?, description=?, agent=?, type=?, amount=? 
            WHERE id=?
        ');
        $stmt->execute([$date, $description, $agent, $type, $amount, $id]);

        $stmt = $db->prepare('SELECT * FROM ledger_entries WHERE id = ?');
        $stmt->execute([$id]);

        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        return;
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('SELECT id FROM ledger_entries WHERE id = ?');
        $stmt->execute([$id]);

        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Entry not found']);
            return;
        }

        $db->prepare('DELETE FROM ledger_entries WHERE id = ?')->execute([$id]);

        echo json_encode(['success' => true]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}