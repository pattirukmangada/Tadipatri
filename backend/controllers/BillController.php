<?php
// backend/controllers/BillController.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/BuyerLedgerController.php';

function calcCommission(float $totalAmount, float $commissionRate): float {
    return floor(($totalAmount * $commissionRate) / 1000);
}

function calcNetAmount(float $totalAmount, float $commission, float $cooli, float $chariti, float $transport): float {
    return round($totalAmount - $commission - $cooli - $chariti - $transport);
}

function getCommissionRate(PDO $db): float {
    $stmt = $db->query('SELECT commission_rate FROM settings LIMIT 1');
    $row  = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (float)$row['commission_rate'] : 100.0;
}

function handleBills(string $method, ?string $id, array $query): void {
    requireAuth();
    $db = getDB();

    if ($method === 'GET' && !$id) {
        if (isset($query['serial'])) {
            $stmt = $db->prepare("
                SELECT id, patti_name, date, serial_number, total_bags, total_amount, net_amount, is_paid
                FROM bills WHERE serial_number = ?
                ORDER BY date DESC LIMIT 1
            ");
            $stmt->execute([$query['serial']]);
            $bill = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$bill) {
                http_response_code(404);
                echo json_encode(['error' => 'Bill not found']);
                return;
            }
            echo json_encode($bill);
            return;
        }

        $date = $query['date'] ?? date('Y-m-d');
        $stmt = $db->prepare('SELECT * FROM bills WHERE date = ? ORDER BY serial_number ASC');
        $stmt->execute([$date]);
        $bills = $stmt->fetchAll();
        foreach ($bills as &$bill) {
            $bill['items']   = getBillItems($db, $bill['id']);
            $bill['is_paid'] = (int)($bill['is_paid'] ?? 0);
        }
        echo json_encode($bills);
        return;
    }

    if ($method === 'GET' && $id) {
        $stmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
        $stmt->execute([$id]);
        $bill = $stmt->fetch();
        if (!$bill) {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
            return;
        }
        $bill['items']   = getBillItems($db, $bill['id']);
        $bill['is_paid'] = (int)($bill['is_paid'] ?? 0);
        echo json_encode($bill);
        return;
    }

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $pattiName = trim((string)($body['patti_name'] ?? ''));
        if ($pattiName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Patti name is required']);
            return;
        }

        $date        = $body['date'] ?? date('Y-m-d');
        $totalBags   = (int)($body['total_bags']   ?? 0);
        $totalAmount = (float)($body['total_amount'] ?? 0);
        $cooli       = (float)($body['cooli']       ?? 0);
        $chariti     = (float)($body['chariti']     ?? 0);
        $transport   = (float)($body['transport']   ?? 0);

        $commissionRate = getCommissionRate($db);
        $commission     = calcCommission($totalAmount, $commissionRate);
        $netAmount      = calcNetAmount($totalAmount, $commission, $cooli, $chariti, $transport);

        try {
            $db->beginTransaction();
            $serial = getNextSerialNumber($db, $date);

            $stmt = $db->prepare('
                INSERT INTO bills
                    (patti_name, date, serial_number, total_bags, total_amount,
                     commission, cooli, chariti, transport, net_amount, is_paid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ');
            $stmt->execute([
                $pattiName, $date, $serial,
                $totalBags, $totalAmount,
                $commission, $cooli, $chariti, $transport, $netAmount,
            ]);
            $billId = $db->lastInsertId();

            if (!empty($body['items'])) {
                insertBillItems($db, (int)$billId, $body['items']);
            }

            $db->commit();

            // Sync buyer ledger (after commit so items are readable)
            syncBuyerLedgerFromBill($db, (int)$billId, 'create');
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        $stmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
        $stmt->execute([$billId]);
        $bill          = $stmt->fetch();
        $bill['items'] = getBillItems($db, (int)$billId);
        $bill['is_paid'] = 0;
        http_response_code(201);
        echo json_encode($bill);
        return;
    }

    if ($method === 'PUT' && $id) {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request body']);
            return;
        }

        $stmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
            return;
        }

        $pattiName = trim((string)($body['patti_name'] ?? $existing['patti_name']));
        if ($pattiName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Patti name is required']);
            return;
        }

        $date        = $body['date']         ?? $existing['date'];
        $totalBags   = (int)($body['total_bags']   ?? $existing['total_bags']);
        $totalAmount = (float)($body['total_amount'] ?? $existing['total_amount']);
        $cooli       = (float)($body['cooli']       ?? $existing['cooli']);
        $chariti     = (float)($body['chariti']     ?? $existing['chariti']);
        $transport   = (float)($body['transport']   ?? $existing['transport']);

        $commissionRate = getCommissionRate($db);
        $commission     = calcCommission($totalAmount, $commissionRate);
        $netAmount      = calcNetAmount($totalAmount, $commission, $cooli, $chariti, $transport);

        $serial = $existing['date'] === $date
            ? (int)$existing['serial_number']
            : getNextSerialNumber($db, $date, (int)$id);

        try {
            $db->beginTransaction();

            $stmt = $db->prepare('
                UPDATE bills SET
                    patti_name=?, date=?, serial_number=?,
                    total_bags=?, total_amount=?,
                    commission=?, cooli=?, chariti=?, transport=?, net_amount=?
                WHERE id=?
            ');
            $stmt->execute([
                $pattiName, $date, $serial,
                $totalBags, $totalAmount,
                $commission, $cooli, $chariti, $transport, $netAmount,
                $id,
            ]);

            if (isset($body['items'])) {
                $db->prepare('DELETE FROM bill_items WHERE bill_id = ?')->execute([$id]);
                insertBillItems($db, (int)$id, $body['items']);
            }

            $db->commit();

            // Sync buyer ledger (after commit)
            syncBuyerLedgerFromBill($db, (int)$id, 'update');
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            throw $e;
        }

        $stmt = $db->prepare('SELECT * FROM bills WHERE id = ?');
        $stmt->execute([$id]);
        $bill          = $stmt->fetch();
        $bill['items'] = getBillItems($db, $id);
        $bill['is_paid'] = (int)($bill['is_paid'] ?? 0);
        echo json_encode($bill);
        return;
    }

    if ($method === 'DELETE' && $id) {
        // Remove buyer ledger debit entries first
        syncBuyerLedgerFromBill($db, (int)$id, 'delete');
        $db->prepare('DELETE FROM bills WHERE id = ?')->execute([$id]);
        echo json_encode(['success' => true]);
        return;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

// ── PAID TOGGLE ──────────────────────────────────────────────────────────────

function handleBillPaidToggle(int $id): void {
    requireAuth();
    $db = getDB();

    $body   = json_decode(file_get_contents('php://input'), true);
    $isPaid = isset($body['is_paid']) ? (int)(bool)$body['is_paid'] : 0;

    $stmt = $db->prepare('SELECT id FROM bills WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Bill not found']);
        return;
    }

    $db->prepare('UPDATE bills SET is_paid = ? WHERE id = ?')->execute([$isPaid, $id]);
    echo json_encode(['success' => true, 'is_paid' => $isPaid]);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getNextSerialNumber(PDO $db, string $date, ?int $excludeBillId = null): int {
    $sql    = 'SELECT COALESCE(MAX(serial_number), 0) + 1 as next FROM bills WHERE date = ?';
    $params = [$date];
    if ($excludeBillId !== null) {
        $sql    .= ' AND id <> ?';
        $params[] = $excludeBillId;
    }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return (int)($stmt->fetch()['next'] ?? 1);
}

function getBillItems(PDO $db, int $billId): array {
    $stmt = $db->prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC');
    $stmt->execute([$billId]);
    return $stmt->fetchAll();
}

function insertBillItems(PDO $db, int $billId, array $items): void {
    $stmt = $db->prepare('
        INSERT INTO bill_items (bill_id, buyer_name, item_name, bags, rate, total)
        VALUES (?, ?, ?, ?, ?, ?)
    ');
    foreach ($items as $item) {
        $bags = (int)($item['bags'] ?? 0);
        $rate = (float)($item['rate'] ?? 0);
        $stmt->execute([
            $billId,
            $item['buyer_name'] ?? '',
            $item['item_name']  ?? 'Lemon',
            $bags,
            $rate,
            $bags * $rate,
        ]);
    }
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────

function handleDashboardStats(array $query): void {
    requireAuth();
    $db    = getDB();
    $date  = $query['date'] ?? date('Y-m-d');
    $month = date('Y-m', strtotime($date));
    $year  = date('Y', strtotime($date));
    $from  = $query['from'] ?? '';
    $to    = $query['to']   ?? '';

    $today  = safeDashboardTier($db, $date,  'day');
    $month  = safeDashboardTier($db, $month, 'month');
    $year   = safeDashboardTier($db, $year,  'year');
    $custom = null;

    if ($from && $to) {
        $custom = safeDashboardRange($db, $from, $to);
    }

    $layers = ['today' => $today, 'month' => $month, 'year' => $year];
    if ($custom !== null) $layers['custom'] = $custom;

    $hasError = false;
    foreach ($layers as $tier) {
        if (!empty($tier['error'])) { $hasError = true; break; }
    }

    if ($hasError) {
        echo json_encode(array_merge(['hasError' => true], $layers));
        return;
    }

    echo json_encode($layers);
}

function safeDashboardTier(PDO $db, string $period, string $type): array {
    try {
        return getDashboardTier($db, $period, $type);
    } catch (Throwable $e) {
        error_log("Dashboard tier error [$type]: " . $e->getMessage());
        return [
            'total_bills' => 0, 'total_bags' => 0, 'total_amount' => 0,
            'total_commission' => 0, 'total_cooli' => 0, 'total_chariti' => 0,
            'total_transport' => 0, 'total_net' => 0, 'bills' => [],
            'error' => "failed to load $type tier: {$e->getMessage()}"
        ];
    }
}

function getDashboardTier(PDO $db, string $period, string $type): array {
    if ($type === 'day') {
        $where = 'WHERE date = ?';
    } elseif ($type === 'month') {
        $where = "WHERE DATE_FORMAT(date, '%Y-%m') = ?";
    } else {
        $where = "WHERE YEAR(date) = ?";
    }

    $stmt = $db->prepare("
        SELECT
            COUNT(*)                        AS total_bills,
            COALESCE(SUM(total_bags),   0)  AS total_bags,
            COALESCE(SUM(total_amount), 0)  AS total_amount,
            COALESCE(SUM(commission),   0)  AS total_commission,
            COALESCE(SUM(cooli),        0)  AS total_cooli,
            COALESCE(SUM(chariti),      0)  AS total_chariti,
            COALESCE(SUM(transport),    0)  AS total_transport,
            COALESCE(SUM(net_amount),   0)  AS total_net
        FROM bills $where
    ");

    if (!$stmt->execute([$period])) {
        return [
            'total_bills' => 0, 'total_bags' => 0, 'total_amount' => 0,
            'total_commission' => 0, 'total_cooli' => 0, 'total_chariti' => 0,
            'total_transport' => 0, 'total_net' => 0, 'bills' => []
        ];
    }

    $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [
        'total_bills' => 0, 'total_bags' => 0, 'total_amount' => 0,
        'total_commission' => 0, 'total_cooli' => 0, 'total_chariti' => 0,
        'total_transport' => 0, 'total_net' => 0,
    ];

    $bills = [];
    if ($type === 'day') {
        $stmt2 = $db->prepare("
            SELECT id, patti_name, total_amount, net_amount, total_bags, is_paid
            FROM bills $where ORDER BY serial_number
        ");
        if ($stmt2->execute([$period])) {
            $bills = $stmt2->fetchAll();
        }
    }

    return array_merge($stats, ['bills' => $bills]);
}

function safeDashboardRange(PDO $db, string $from, string $to): array {
    try {
        return getDashboardRange($db, $from, $to);
    } catch (Throwable $e) {
        error_log("Dashboard range error [$from to $to]: " . $e->getMessage());
        return [
            'total_bills' => 0, 'total_bags' => 0, 'total_amount' => 0,
            'total_commission' => 0, 'total_cooli' => 0, 'total_chariti' => 0,
            'total_transport' => 0, 'total_net' => 0, 'bills' => [],
            'error' => "failed to load custom range $from to $to: {$e->getMessage()}"
        ];
    }
}

function getDashboardRange(PDO $db, string $from, string $to): array {
    $stmt = $db->prepare("
        SELECT
            COUNT(*)                        AS total_bills,
            COALESCE(SUM(total_bags),   0)  AS total_bags,
            COALESCE(SUM(total_amount), 0)  AS total_amount,
            COALESCE(SUM(commission),   0)  AS total_commission,
            COALESCE(SUM(cooli),        0)  AS total_cooli,
            COALESCE(SUM(chariti),      0)  AS total_chariti,
            COALESCE(SUM(transport),    0)  AS total_transport,
            COALESCE(SUM(net_amount),   0)  AS total_net
        FROM bills WHERE date >= ? AND date <= ?
    ");

    if (!$stmt->execute([$from, $to])) {
        throw new Exception('Failed to query dashboard range');
    }

    $stats = $stmt->fetch(PDO::FETCH_ASSOC) ?: [
        'total_bills' => 0, 'total_bags' => 0, 'total_amount' => 0,
        'total_commission' => 0, 'total_cooli' => 0, 'total_chariti' => 0,
        'total_transport' => 0, 'total_net' => 0,
    ];

    return array_merge($stats, ['bills' => []]);
}

// ── BUYER PURCHASES ───────────────────────────────────────────────────────────

function handleBuyerPurchases(array $query): void {
    requireAuth();
    $db = getDB();

    $buyer = trim($query['buyer'] ?? '');
    $from  = $query['from']  ?? date('Y-m-d');
    $to    = $query['to']    ?? date('Y-m-d');
    $exact = !empty($query['exact']);

    $conditions = [];
    $params     = [];

    if ($buyer !== '') {
        if ($exact) {
            $conditions[] = "bi.buyer_name COLLATE utf8mb4_unicode_ci = ?";
            $params[]     = $buyer;
        } else {
            $conditions[] = "bi.buyer_name COLLATE utf8mb4_unicode_ci LIKE ?";
            $params[]     = "%$buyer%";
        }
    }

    if ($from) { $conditions[] = 'b.date >= ?'; $params[] = $from; }
    if ($to)   { $conditions[] = 'b.date <= ?'; $params[] = $to;   }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $stmt = $db->prepare("
        SELECT
            bi.buyer_name  COLLATE utf8mb4_unicode_ci AS buyer_name,
            b.patti_name   COLLATE utf8mb4_unicode_ci AS patti_name,
            bi.item_name   COLLATE utf8mb4_unicode_ci AS item_name,
            bi.bags,
            bi.rate,
            (bi.bags * bi.rate) AS amount,
            b.date
        FROM bill_items bi
        JOIN bills b ON b.id = bi.bill_id
        $where
        ORDER BY b.date ASC, b.serial_number ASC, bi.id ASC
    ");
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// ── PATTI PURCHASES ──────────────────────────────────────────────────────────

function handlePattiPurchases(array $query): void {
    requireAuth();
    $db = getDB();

    $patti = $query['patti'] ?? '';
    $from  = $query['from']  ?? '';
    $to    = $query['to']    ?? '';

    $conditions = [];
    $params     = [];

    if ($patti) {
        $conditions[] = "b.patti_name COLLATE utf8mb4_unicode_ci LIKE ?";
        $params[]     = "%$patti%";
    }
    if ($from) { $conditions[] = 'b.date >= ?'; $params[] = $from; }
    if ($to)   { $conditions[] = 'b.date <= ?'; $params[] = $to;   }

    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $stmt = $db->prepare("
        SELECT
            b.id,
            b.patti_name COLLATE utf8mb4_unicode_ci AS patti_name,
            b.date,
            b.serial_number,
            b.total_bags,
            b.total_amount,
            b.net_amount
        FROM bills b
        $where
        ORDER BY b.date DESC, b.serial_number DESC
    ");
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// ── PRINTED TOGGLE ────────────────────────────────────────────────────────────

function handleBillPrintedToggle(int $id): void {
    requireAuth();
    $db = getDB();

    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $isPrinted = isset($body['is_printed']) ? (int)(bool)$body['is_printed'] : 0;

    $stmt = $db->prepare('SELECT id FROM bills WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Bill not found']);
        return;
    }

    $db->prepare('UPDATE bills SET is_printed = ? WHERE id = ?')
       ->execute([$isPrinted, $id]);

    echo json_encode(['success' => true, 'is_printed' => $isPrinted]);
}

// ── TOP SALES ────────────────────────────────────────────────────────────────

function handleTopSales(): void {
    $db    = getDB();
    $today = date('Y-m-d');

    $stmt = $db->prepare("
        SELECT
            b.patti_name                                                AS patti_name,
            SUM(bi.bags)                                                AS total_bags,
            SUM(bi.total)                                               AS total_amount,
            COUNT(DISTINCT b.id)                                        AS bill_count,
            MAX(bi.rate)                                                AS max_rate,
            GROUP_CONCAT(
                CONCAT(bi.buyer_name, ' (', bi.bags, ' bags @ Rs.', bi.rate, ')')
                ORDER BY bi.rate DESC
                SEPARATOR ' | '
            )                                                           AS item_summary
        FROM bills b
        JOIN bill_items bi ON bi.bill_id = b.id
        WHERE b.date = ?
        GROUP BY b.patti_name
        ORDER BY max_rate DESC, total_bags DESC
        LIMIT 10
    ");

    $stmt->execute([$today]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}