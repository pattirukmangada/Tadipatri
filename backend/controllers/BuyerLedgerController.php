<?php
// backend/controllers/BuyerLedgerController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// ============================================================
// BUYER PAYMENTS  (/buyer-payments)
// ============================================================

function handleBuyerPayments(string $method, ?string $id, array $query): void {
    requireAuth();
    $db = getDB();

    // ── GET LIST ─────────────────────────────────────────────
    if ($method === 'GET' && !$id) {
        $conditions = [];
        $params     = [];

        if (!empty($query['buyer'])) {
            $conditions[] = 'buyer_name COLLATE utf8mb4_unicode_ci = ?';
            $params[]     = $query['buyer'];
        }
        if (!empty($query['from'])) {
            $conditions[] = 'date >= ?';
            $params[]     = $query['from'];
        }
        if (!empty($query['to'])) {
            $conditions[] = 'date <= ?';
            $params[]     = $query['to'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $stmt = $db->prepare("
            SELECT id, buyer_name, date, credit_amount, hamali, description, created_at
            FROM buyer_payments
            $where
            ORDER BY date ASC, id ASC
        ");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        return;
    }

    // ── GET SINGLE ───────────────────────────────────────────
    if ($method === 'GET' && $id) {
        $stmt = $db->prepare('SELECT * FROM buyer_payments WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Payment not found']);
            return;
        }
        echo json_encode($row);
        return;
    }

    // ── POST (CREATE) ────────────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $buyerName    = trim($body['buyer_name']    ?? '');
        $date         = trim($body['date']          ?? date('Y-m-d'));
        $creditAmount = (float)($body['credit_amount'] ?? 0);
        $hamali       = (float)($body['hamali']        ?? 0);
        $description  = trim($body['description']   ?? '');

        if ($buyerName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'buyer_name is required']);
            return;
        }

        try {
            $db->beginTransaction();

            // Insert payment
            $stmt = $db->prepare('
                INSERT INTO buyer_payments (buyer_name, date, credit_amount, hamali, description)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([$buyerName, $date, $creditAmount, $hamali, $description]);
            $paymentId = (int)$db->lastInsertId();

            // Insert ledger credit entry (only if credit_amount > 0)
            if ($creditAmount > 0) {
                $desc = $description ?: 'Payment Received';
                upsertBuyerLedgerEntry($db, [
                    'buyer_name'  => $buyerName,
                    'date'        => $date,
                    'description' => $desc,
                    'type'        => 'credit',
                    'amount'      => $creditAmount,
                    'ref_type'    => 'payment',
                    'ref_id'      => $paymentId,
                ]);
            }

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        $stmt = $db->prepare('SELECT * FROM buyer_payments WHERE id = ?');
        $stmt->execute([$paymentId]);
        http_response_code(201);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        return;
    }

    // ── PUT (UPDATE) ─────────────────────────────────────────
    if ($method === 'PUT' && $id) {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $stmt = $db->prepare('SELECT * FROM buyer_payments WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Payment not found']);
            return;
        }

        $buyerName    = trim($body['buyer_name']    ?? $existing['buyer_name']);
        $date         = trim($body['date']          ?? $existing['date']);
        $creditAmount = (float)($body['credit_amount'] ?? $existing['credit_amount']);
        $hamali       = (float)($body['hamali']        ?? $existing['hamali']);
        $description  = trim($body['description']   ?? $existing['description']);

        try {
            $db->beginTransaction();

            // Update payment
            $stmt = $db->prepare('
                UPDATE buyer_payments
                SET buyer_name=?, date=?, credit_amount=?, hamali=?, description=?
                WHERE id=?
            ');
            $stmt->execute([$buyerName, $date, $creditAmount, $hamali, $description, $id]);

            // Remove old ledger entry for this payment, re-insert if amount > 0
            $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='payment' AND ref_id=?")->execute([$id]);

            if ($creditAmount > 0) {
                $desc = $description ?: 'Payment Received';
                upsertBuyerLedgerEntry($db, [
                    'buyer_name'  => $buyerName,
                    'date'        => $date,
                    'description' => $desc,
                    'type'        => 'credit',
                    'amount'      => $creditAmount,
                    'ref_type'    => 'payment',
                    'ref_id'      => (int)$id,
                ]);
            }

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        $stmt = $db->prepare('SELECT * FROM buyer_payments WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        return;
    }

    // ── DELETE ───────────────────────────────────────────────
    if ($method === 'DELETE' && $id) {
        $db->beginTransaction();
        try {
            // Remove ledger credit entry
            $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='payment' AND ref_id=?")->execute([$id]);
            // Remove payment
            $db->prepare('DELETE FROM buyer_payments WHERE id = ?')->execute([$id]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }
        echo json_encode(['success' => true]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ============================================================
// BUYER LEDGER  (/buyer-ledger)
// ============================================================

function handleBuyerLedger(string $method, ?string $id, array $query): void {
    requireAuth();
    $db = getDB();

    // ── GET LIST (with running balance) ──────────────────────
    if ($method === 'GET' && !$id) {
        $buyer = trim($query['buyer'] ?? '');
        $from  = $query['from'] ?? null;
        $to    = $query['to']   ?? null;

        $conditions = [];
        $params     = [];

        if ($buyer !== '') {
            $conditions[] = 'buyer_name COLLATE utf8mb4_unicode_ci = ?';
            $params[]     = $buyer;
        }
        if ($from) { $conditions[] = 'date >= ?'; $params[] = $from; }
        if ($to)   { $conditions[] = 'date <= ?'; $params[] = $to;   }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $stmt = $db->prepare("
            SELECT id, buyer_name, date, description, type, amount, ref_type, ref_id, created_at
            FROM buyer_ledger
            $where
            ORDER BY date ASC, id ASC
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Compute running balance
        $balance     = 0.0;
        $totalDebit  = 0.0;
        $totalCredit = 0.0;

        foreach ($rows as &$row) {
            $amt = (float)$row['amount'];
            if ($row['type'] === 'debit') {
                $balance    += $amt;
                $totalDebit += $amt;
            } else {
                $balance     -= $amt;
                $totalCredit += $amt;
            }
            $row['running_balance'] = $balance;
        }
        unset($row);

        // Previous balance (entries BEFORE $from for this buyer)
        $prevBalance = 0.0;
        if ($from && $buyer !== '') {
            $pStmt = $db->prepare("
                SELECT type, amount FROM buyer_ledger
                WHERE buyer_name COLLATE utf8mb4_unicode_ci = ?
                  AND date < ?
                ORDER BY date ASC, id ASC
            ");
            $pStmt->execute([$buyer, $from]);
            foreach ($pStmt->fetchAll(PDO::FETCH_ASSOC) as $pr) {
                if ($pr['type'] === 'debit') {
                    $prevBalance += (float)$pr['amount'];
                } else {
                    $prevBalance -= (float)$pr['amount'];
                }
            }
        }

        // Distinct buyers for autocomplete
        $bStmt = $db->query("
            SELECT DISTINCT TRIM(buyer_name) as buyer_name
            FROM buyer_ledger
            ORDER BY buyer_name ASC
        ");
        $buyers = $bStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'entries'        => $rows,
            'total_debit'    => $totalDebit,
            'total_credit'   => $totalCredit,
            'balance'        => $totalDebit - $totalCredit,
            'prev_balance'   => $prevBalance,
            'buyers'         => $buyers,
        ]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ============================================================
// BUYER BALANCE SUMMARY  (/buyer-balance?buyer=X)
// Returns prev_balance, today_patti_amount, current_balance
// Used by BillPrint
// ============================================================

function handleBuyerBalance(array $query): void {
    requireAuth();
    $db = getDB();

    $buyer  = trim($query['buyer']  ?? '');
    $billId = (int)($query['bill_id'] ?? 0);

    if ($buyer === '' || $billId === 0) {
        echo json_encode(['prev_balance' => 0, 'patti_amount' => 0, 'current_balance' => 0]);
        return;
    }

    // Get all ledger entries for this buyer ordered chronologically
    $stmt = $db->prepare("
        SELECT id, type, amount, ref_type, ref_id
        FROM buyer_ledger
        WHERE buyer_name COLLATE utf8mb4_unicode_ci = ?
        ORDER BY date ASC, id ASC
    ");
    $stmt->execute([$buyer]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $prevBalance    = 0.0;
    $pattiAmount    = 0.0;
    $foundThisBill  = false;

    foreach ($rows as $row) {
        $amt = (float)$row['amount'];
        if ($row['ref_type'] === 'patti' && (int)$row['ref_id'] === $billId) {
            // This is the current patti's debit entry
            $pattiAmount   = $amt;
            $foundThisBill = true;
            continue; // Don't add to prevBalance
        }
        if ($row['type'] === 'debit') {
            $prevBalance += $amt;
        } else {
            $prevBalance -= $amt;
        }
    }

    echo json_encode([
        'prev_balance'    => $prevBalance,
        'patti_amount'    => $pattiAmount,
        'current_balance' => $prevBalance + $pattiAmount,
        'found'           => $foundThisBill,
    ]);
}

// ============================================================
// SHARED HELPER: upsert ledger entry
// ============================================================

function upsertBuyerLedgerEntry(PDO $db, array $data): void {
    // Delete existing entry for this ref
    $db->prepare("
        DELETE FROM buyer_ledger WHERE ref_type = ? AND ref_id = ?
    ")->execute([$data['ref_type'], $data['ref_id']]);

    // Insert fresh
    $stmt = $db->prepare('
        INSERT INTO buyer_ledger (buyer_name, date, description, type, amount, ref_type, ref_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $data['buyer_name'],
        $data['date'],
        $data['description'],
        $data['type'],
        $data['amount'],
        $data['ref_type'],
        $data['ref_id'],
    ]);
}

// ============================================================
// CALLED FROM BillController on bill CREATE / UPDATE / DELETE
// ============================================================

function syncBuyerLedgerFromBill(PDO $db, int $billId, string $action): void {
    // action = 'create' | 'update' | 'delete'

    if ($action === 'delete') {
        // Remove all debit entries for this bill
        $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='patti' AND ref_id=?")->execute([$billId]);
        return;
    }

    // Fetch bill + items
    $billStmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
    $billStmt->execute([$billId]);
    $bill = $billStmt->fetch(PDO::FETCH_ASSOC);
    if (!$bill) return;

    $itemStmt = $db->prepare('SELECT * FROM bill_items WHERE bill_id = ?');
    $itemStmt->execute([$billId]);
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    // Remove old ledger entries for this bill
    $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='patti' AND ref_id=?")->execute([$billId]);

    // Group items by buyer_name → sum of (bags * rate)
    $byBuyer = [];
    foreach ($items as $item) {
        $buyerName = trim($item['buyer_name']);
        if ($buyerName === '') continue;
        $amount = (float)$item['bags'] * (float)$item['rate'];
        if (!isset($byBuyer[$buyerName])) {
            $byBuyer[$buyerName] = 0.0;
        }
        $byBuyer[$buyerName] += $amount;
    }

    if (empty($byBuyer)) return;

    // Build description like "Patti No 101"
    $description = 'Patti No ' . $bill['serial_number'];

    // If multiple buyers in one bill, create separate ledger entries per buyer
    // ref_id = bill_id for all (patti type), but we need separate rows per buyer.
    // We store all under same bill_id; use a composite insert.
    $insertStmt = $db->prepare('
        INSERT INTO buyer_ledger (buyer_name, date, description, type, amount, ref_type, ref_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    foreach ($byBuyer as $buyerName => $amount) {
        if ($amount <= 0) continue;
        $insertStmt->execute([
            $buyerName,
            $bill['date'],
            $description,
            'debit',
            round($amount, 2),
            'patti',
            $billId,
        ]);
    }
}
