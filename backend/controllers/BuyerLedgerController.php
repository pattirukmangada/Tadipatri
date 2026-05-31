<?php
// backend/controllers/BuyerLedgerController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// ============================================================
// BUYER PAYMENTS  (/buyer-payments)
// Handles both manual credit and manual debit entries.
// Patti debits are synced automatically via syncBuyerLedgerFromBill().
//
// buyer_payments table columns used:
//   entry_type  ENUM('credit','debit')
//   amount      DECIMAL  — the value entered by the user
//   hamali      DECIMAL  — stored but NOT used in ledger calculations
//   description VARCHAR
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
        if (!empty($query['from'])) { $conditions[] = 'date >= ?'; $params[] = $query['from']; }
        if (!empty($query['to']))   { $conditions[] = 'date <= ?'; $params[] = $query['to'];   }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $stmt  = $db->prepare("
            SELECT id, buyer_name, date, entry_type, amount, hamali, description, created_at
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
        if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); return; }
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

        $buyerName  = trim($body['buyer_name'] ?? '');
        $date       = trim($body['date']       ?? date('Y-m-d'));
        $entryType  = in_array($body['entry_type'] ?? '', ['credit','debit']) ? $body['entry_type'] : 'credit';
        $amount     = (float)($body['amount']  ?? 0);
        $hamali     = (float)($body['hamali']  ?? 0);
        $description = trim($body['description'] ?? '');

        if ($buyerName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'buyer_name is required']);
            return;
        }
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Amount must be greater than 0']);
            return;
        }

        try {
            $db->beginTransaction();

            $stmt = $db->prepare('
                INSERT INTO buyer_payments (buyer_name, date, entry_type, amount, hamali, description)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([$buyerName, $date, $entryType, $amount, $hamali, $description]);
            $paymentId = (int)$db->lastInsertId();

            // Insert ledger entry (credit or debit)
            $desc = $description ?: ($entryType === 'credit' ? 'Payment Received' : 'Debit Entry');
            upsertBuyerLedgerEntry($db, [
                'buyer_name'  => $buyerName,
                'date'        => $date,
                'description' => $desc,
                'type'        => $entryType,
                'amount'      => $amount,
                'ref_type'    => 'payment',
                'ref_id'      => $paymentId,
            ]);

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

        $buyerName   = trim($body['buyer_name']  ?? $existing['buyer_name']);
        $date        = trim($body['date']        ?? $existing['date']);
        $entryType   = in_array($body['entry_type'] ?? '', ['credit','debit'])
                         ? $body['entry_type']
                         : $existing['entry_type'];
        $amount      = isset($body['amount'])    ? (float)$body['amount']  : (float)$existing['amount'];
        $hamali      = isset($body['hamali'])    ? (float)$body['hamali']  : (float)$existing['hamali'];
        $description = trim($body['description'] ?? $existing['description']);

        try {
            $db->beginTransaction();

            $stmt = $db->prepare('
                UPDATE buyer_payments
                SET buyer_name=?, date=?, entry_type=?, amount=?, hamali=?, description=?
                WHERE id=?
            ');
            $stmt->execute([$buyerName, $date, $entryType, $amount, $hamali, $description, $id]);

            // Re-sync ledger entry
            $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='payment' AND ref_id=?")->execute([$id]);
            $desc = $description ?: ($entryType === 'credit' ? 'Payment Received' : 'Debit Entry');
            upsertBuyerLedgerEntry($db, [
                'buyer_name'  => $buyerName,
                'date'        => $date,
                'description' => $desc,
                'type'        => $entryType,
                'amount'      => $amount,
                'ref_type'    => 'payment',
                'ref_id'      => (int)$id,
            ]);

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
            $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='payment' AND ref_id=?")->execute([$id]);
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

        // Running balance
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
            $row['running_balance'] = round($balance, 2);
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
                $prevBalance += $pr['type'] === 'debit' ? (float)$pr['amount'] : -(float)$pr['amount'];
            }
        }

        // Buyers autocomplete — from both ledger and bills
        $bStmt = $db->query("
            SELECT DISTINCT TRIM(buyer_name) as buyer_name
            FROM buyer_ledger
            WHERE TRIM(buyer_name) <> ''
            UNION
            SELECT DISTINCT TRIM(buyer_name)
            FROM bill_items
            WHERE TRIM(buyer_name) <> ''
            ORDER BY buyer_name ASC
        ");
        $buyers = $bStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'entries'      => $rows,
            'total_debit'  => round($totalDebit,  2),
            'total_credit' => round($totalCredit, 2),
            'balance'      => round($totalDebit - $totalCredit, 2),
            'prev_balance' => round($prevBalance, 2),
            'buyers'       => $buyers,
        ]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ============================================================
// BUYER BALANCE  (/buyer-balance?buyer=X&bill_id=Y)
// Used by BillPrint to show Previous Balance / Today / Current
// ============================================================

function handleBuyerBalance(array $query): void {
    requireAuth();
    $db = getDB();

    $buyer  = trim($query['buyer']  ?? '');
    $billId = (int)($query['bill_id'] ?? 0);

    if ($buyer === '' || $billId === 0) {
        echo json_encode(['prev_balance' => 0, 'patti_amount' => 0, 'current_balance' => 0, 'found' => false]);
        return;
    }

    $stmt = $db->prepare("
        SELECT id, type, amount, ref_type, ref_id
        FROM buyer_ledger
        WHERE buyer_name COLLATE utf8mb4_unicode_ci = ?
        ORDER BY date ASC, id ASC
    ");
    $stmt->execute([$buyer]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $prevBalance   = 0.0;
    $pattiAmount   = 0.0;
    $foundThisBill = false;

    foreach ($rows as $row) {
        $amt = (float)$row['amount'];
        if ($row['ref_type'] === 'patti' && (int)$row['ref_id'] === $billId) {
            $pattiAmount   = $amt;
            $foundThisBill = true;
            continue;
        }
        $prevBalance += $row['type'] === 'debit' ? $amt : -$amt;
    }

    echo json_encode([
        'prev_balance'    => round($prevBalance, 2),
        'patti_amount'    => round($pattiAmount, 2),
        'current_balance' => round($prevBalance + $pattiAmount, 2),
        'found'           => $foundThisBill,
    ]);
}

// ============================================================
// HELPER: upsert single ledger entry
// ============================================================

function upsertBuyerLedgerEntry(PDO $db, array $data): void {
    $db->prepare("DELETE FROM buyer_ledger WHERE ref_type = ? AND ref_id = ?")->execute([
        $data['ref_type'], $data['ref_id']
    ]);
    $db->prepare('
        INSERT INTO buyer_ledger (buyer_name, date, description, type, amount, ref_type, ref_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ')->execute([
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
// BUYER HAMALI  (/buyer-hamali)
// Stores a flat hamali amount per buyer (one row per buyer).
// GET  /buyer-hamali           → list all { buyer_name, hamali }
// GET  /buyer-hamali?buyer=X   → single buyer hamali
// POST /buyer-hamali           → upsert { buyer_name, hamali }
// ============================================================

function handleBuyerHamali(string $method, array $query): void {
    requireAuth();
    $db = getDB();

    if ($method === 'GET') {
        $buyer = trim($query['buyer'] ?? '');
        if ($buyer !== '') {
            $stmt = $db->prepare("
                SELECT buyer_name, COALESCE(hamali, 0) as hamali
                FROM buyer_hamali
                WHERE buyer_name COLLATE utf8mb4_unicode_ci = ?
            ");
            $stmt->execute([$buyer]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($row ?: ['buyer_name' => $buyer, 'hamali' => 0]);
        } else {
            // Return all buyer hamali as a map { buyer_name: hamali }
            $stmt = $db->query("SELECT buyer_name, hamali FROM buyer_hamali ORDER BY buyer_name ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $map  = [];
            foreach ($rows as $r) {
                $map[$r['buyer_name']] = (float)$r['hamali'];
            }
            echo json_encode($map);
        }
        return;
    }

    if ($method === 'POST') {
        $body      = json_decode(file_get_contents('php://input'), true);
        $buyerName = trim($body['buyer_name'] ?? '');
        $hamali    = (float)($body['hamali']    ?? 0);

        if ($buyerName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'buyer_name is required']);
            return;
        }

        try {
            $db->beginTransaction();

            // 1. Save/update hamali for this buyer
            $stmt = $db->prepare("
                INSERT INTO buyer_hamali (buyer_name, hamali)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE hamali = VALUES(hamali)
            ");
            $stmt->execute([$buyerName, $hamali]);

            // 2. Re-sync ALL existing bills that contain this buyer
            //    so buyer_ledger debit entries reflect updated hamali immediately
            $billsStmt = $db->prepare("
                SELECT DISTINCT b.id
                FROM bills b
                INNER JOIN bill_items bi ON bi.bill_id = b.id
                WHERE bi.buyer_name COLLATE utf8mb4_unicode_ci = ?
                ORDER BY b.id ASC
            ");
            $billsStmt->execute([$buyerName]);
            $billIds = $billsStmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($billIds as $billId) {
                syncBuyerLedgerFromBill($db, (int)$billId, 'update');
            }

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        echo json_encode([
            'buyer_name'   => $buyerName,
            'hamali'       => $hamali,
            'bills_synced' => count($billIds ?? []),
        ]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ============================================================
// CALLED FROM BillController on CREATE / UPDATE / DELETE
//
// Patti → Buyer Ledger Debit formula:
//   gross        = bags × rate   (per buyer item, summed)
//   hamali       = buyer_hamali.hamali for this buyer (flat, from BuyerSearch page)
//   if hamali > 0:  final = gross - hamali
//   if hamali = 0:  final = gross  (direct, no deduction)
//   → buyer_ledger debit = final
// ============================================================

function syncBuyerLedgerFromBill(PDO $db, int $billId, string $action): void {
    if ($action === 'delete') {
        $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='patti' AND ref_id=?")->execute([$billId]);
        return;
    }

    $billStmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
    $billStmt->execute([$billId]);
    $bill = $billStmt->fetch(PDO::FETCH_ASSOC);
    if (!$bill) return;

    $itemStmt = $db->prepare('SELECT * FROM bill_items WHERE bill_id = ?');
    $itemStmt->execute([$billId]);
    $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    // Remove old ledger entries for this bill
    $db->prepare("DELETE FROM buyer_ledger WHERE ref_type='patti' AND ref_id=?")->execute([$billId]);

    // Sum gross amount per buyer
    $byBuyer = [];
    foreach ($items as $item) {
        $buyerName = trim($item['buyer_name']);
        if ($buyerName === '') continue;
        $gross = (float)$item['bags'] * (float)$item['rate'];
        $byBuyer[$buyerName] = ($byBuyer[$buyerName] ?? 0.0) + $gross;
    }

    if (empty($byBuyer)) return;

    $description = 'Patti No ' . $bill['serial_number'];

    $insertStmt = $db->prepare('
        INSERT INTO buyer_ledger (buyer_name, date, description, type, amount, ref_type, ref_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');

    // Hamali lookup from buyer_hamali table (set on BuyerSearch page)
    $hamaliStmt = $db->prepare("
        SELECT COALESCE(hamali, 0) as hamali
        FROM buyer_hamali
        WHERE buyer_name COLLATE utf8mb4_unicode_ci = ?
    ");

    foreach ($byBuyer as $buyerName => $gross) {
        if ($gross <= 0) continue;

        // Get flat hamali for this buyer
        $hamaliStmt->execute([$buyerName]);
        $hamaliRow  = $hamaliStmt->fetch(PDO::FETCH_ASSOC);
        $hamali     = (float)($hamaliRow['hamali'] ?? 0);

        // Formula: final = (gross x 0.97) + hamali
        // 3% discount applied first, then hamali added
        $finalAmount = round(($gross * 0.97) + $hamali, 2);

        if ($finalAmount <= 0) continue;

        $insertStmt->execute([
            $buyerName,
            $bill['date'],
            $description,
            'debit',
            $finalAmount,
            'patti',
            $billId,
        ]);
    }
}