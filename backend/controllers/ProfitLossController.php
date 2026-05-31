<?php
// backend/controllers/ProfitLossController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

function handleProfitLoss(string $method, ?string $id, array $query): void {
    requireAuth();
    $db = getDB();

    /* ───────── GET (LIST + SUMMARY) ───────── */
    if ($method === 'GET' && !$id) {
        $from       = $query['from']        ?? '';
        $to         = $query['to']          ?? '';
        $partyName  = trim($query['party']  ?? '');

        $conditions = [];
        $params     = [];

        if ($from) {
            $conditions[] = 'DATE(created_at) >= ?';
            $params[]     = $from;
        }
        if ($to) {
            $conditions[] = 'DATE(created_at) <= ?';
            $params[]     = $to;
        }
        if ($partyName !== '') {
            $conditions[] = 'party_name COLLATE utf8mb4_unicode_ci = ?';
            $params[]     = $partyName;
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Records
        $stmt = $db->prepare("
            SELECT * FROM profit_loss
            $where
            ORDER BY created_at DESC
        ");
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Summary
        $stmt2 = $db->prepare("
            SELECT
                COUNT(*) AS total_records,
                COALESCE(SUM(CASE WHEN status = 'profit' THEN net_result ELSE 0 END), 0.00) AS total_profit,
                COALESCE(SUM(CASE WHEN status = 'loss' THEN ABS(net_result) ELSE 0 END), 0.00) AS total_loss,
                COALESCE(SUM(net_result), 0.00) AS overall_net
            FROM profit_loss
            $where
        ");
        $stmt2->execute($params);
        $summary = $stmt2->fetch(PDO::FETCH_ASSOC);

        $summary['total_records'] = (int)$summary['total_records'];
        $summary['total_profit']  = (float)$summary['total_profit'];
        $summary['total_loss']    = (float)$summary['total_loss'];
        $summary['overall_net']   = (float)$summary['overall_net'];

        // Return distinct party names for dropdown
        $partyStmt = $db->query("
            SELECT DISTINCT party_name FROM profit_loss
            WHERE party_name <> ''
            ORDER BY party_name ASC
        ");
        $partyList = $partyStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'records'    => $records,
            'summary'    => $summary,
            'party_list' => $partyList,
        ]);
        return;
    }

    /* ───────── CREATE ───────── */
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $expense    = (float)($body['total_expense'] ?? 0);
        $additional = (float)($body['additional_amt'] ?? 0);
        $advance    = (float)($body['advance_amount'] ?? 0);
        $income     = (float)($body['income'] ?? 0);
        $note       = !empty($body['note'])       ? trim($body['note'])       : null;
        $partyName  = !empty($body['party_name']) ? trim($body['party_name']) : '';

        $totalDeductions = $expense + $additional + $advance;
        $netResult       = $income - $totalDeductions;
        $status          = $netResult >= 0 ? 'profit' : 'loss';

        $stmt = $db->prepare("
            INSERT INTO profit_loss
            (total_expense, additional_amt, advance_amount, total_deductions, income, net_result, status, note, party_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $expense, $additional, $advance,
            $totalDeductions, $income, $netResult, $status,
            $note, $partyName,
        ]);

        echo json_encode([
            'success' => true,
            'id'      => $db->lastInsertId(),
        ]);
        return;
    }

    /* ───────── UPDATE ───────── */
    if ($method === 'PUT' && $id) {
        $body = json_decode(file_get_contents('php://input'), true);

        $expense    = (float)($body['total_expense'] ?? 0);
        $additional = (float)($body['additional_amt'] ?? 0);
        $advance    = (float)($body['advance_amount'] ?? 0);
        $income     = (float)($body['income'] ?? 0);
        $note       = !empty($body['note'])       ? trim($body['note'])       : null;
        $partyName  = isset($body['party_name'])  ? trim($body['party_name']) : '';

        $totalDeductions = $expense + $additional + $advance;
        $netResult       = $income - $totalDeductions;
        $status          = $netResult >= 0 ? 'profit' : 'loss';

        $stmt = $db->prepare("
            UPDATE profit_loss SET
                total_expense = ?, additional_amt = ?, advance_amount = ?,
                total_deductions = ?, income = ?, net_result = ?, status = ?,
                note = ?, party_name = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $expense, $additional, $advance,
            $totalDeductions, $income, $netResult, $status,
            $note, $partyName, $id,
        ]);

        echo json_encode(['success' => true]);
        return;
    }

    /* ───────── DELETE ───────── */
    if ($method === 'DELETE' && $id) {
        $db->prepare("DELETE FROM profit_loss WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}