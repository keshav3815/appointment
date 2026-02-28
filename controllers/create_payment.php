<?php
/**
 * ============================================================
 * Controller — Create Razorpay Payment Order
 * ============================================================
 *
 * Endpoint : POST /controllers/create_payment.php
 * Accepts  : { appointment_id: int }
 * Returns  : JSON { status, order_id, amount, currency, key }
 *
 * Workflow:
 *   1. Validate appointment exists
 *   2. Create Razorpay order via API
 *   3. Store order in payments table
 *   4. Return order details for checkout
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

/* ----------------------------------------------------------
 * 1. POST ONLY
 * ---------------------------------------------------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['status' => 'error', 'message' => 'Method not allowed.'], 405);
}

/* ----------------------------------------------------------
 * 2. READ INPUT
 * ---------------------------------------------------------- */
$input         = json_decode(file_get_contents('php://input'), true);
$appointmentId = (int)($input['appointment_id'] ?? 0);

if ($appointmentId <= 0) {
    jsonResponse(['status' => 'error', 'message' => 'Valid appointment ID is required.'], 422);
}

/* ----------------------------------------------------------
 * 3. VERIFY APPOINTMENT EXISTS & IS UNPAID
 * ---------------------------------------------------------- */
$pdo  = getDBConnection();
$stmt = $pdo->prepare(
    'SELECT a.appointment_id, a.payment_status, p.full_name, p.email, p.mobile
       FROM appointments a
       JOIN patients p ON p.patient_id = a.patient_id
      WHERE a.appointment_id = :id
      LIMIT 1'
);
$stmt->execute([':id' => $appointmentId]);
$appointment = $stmt->fetch();

if (!$appointment) {
    jsonResponse(['status' => 'error', 'message' => 'Appointment not found.'], 404);
}

if ($appointment['payment_status'] === 'Paid') {
    jsonResponse(['status' => 'error', 'message' => 'This appointment has already been paid.'], 409);
}

/* ----------------------------------------------------------
 * 4. CHECK IF AN ORDER ALREADY EXISTS (idempotency)
 * ---------------------------------------------------------- */
$stmt = $pdo->prepare(
    'SELECT razorpay_order_id, amount
       FROM payments
      WHERE appointment_id = :id
        AND payment_status = "Created"
      ORDER BY created_at DESC
      LIMIT 1'
);
$stmt->execute([':id' => $appointmentId]);
$existingOrder = $stmt->fetch();

if ($existingOrder && !empty($existingOrder['razorpay_order_id'])) {
    // Return existing un-paid order
    jsonResponse([
        'status'   => 'success',
        'order_id' => $existingOrder['razorpay_order_id'],
        'amount'   => (int)($existingOrder['amount'] * 100),  // paise
        'currency' => CURRENCY,
        'key'      => RAZORPAY_KEY_ID,
        'name'     => $appointment['full_name'],
        'email'    => $appointment['email'],
        'mobile'   => $appointment['mobile'],
    ]);
}

/* ----------------------------------------------------------
 * 5. CREATE RAZORPAY ORDER VIA API
 * ---------------------------------------------------------- */
$amountINR   = CONSULTATION_FEE;       // in rupees
$amountPaise = $amountINR * 100;        // Razorpay expects paise

$orderData = json_encode([
    'amount'          => $amountPaise,
    'currency'        => CURRENCY,
    'receipt'         => 'APT_' . $appointmentId . '_' . time(),
    'payment_capture' => 1,  // auto-capture
    'notes'           => [
        'appointment_id' => (string)$appointmentId,
        'patient_name'   => $appointment['full_name'],
    ],
]);

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_USERPWD        => RAZORPAY_KEY_ID . ':' . RAZORPAY_KEY_SECRET,
    CURLOPT_POSTFIELDS     => $orderData,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    error_log("Razorpay order creation failed: HTTP {$httpCode} | {$curlError} | {$response}");
    jsonResponse(['status' => 'error', 'message' => 'Payment gateway error. Please try again.'], 502);
}

$order = json_decode($response, true);

if (empty($order['id'])) {
    error_log('Razorpay returned no order id: ' . $response);
    jsonResponse(['status' => 'error', 'message' => 'Payment gateway error. Please try again.'], 502);
}

/* ----------------------------------------------------------
 * 6. STORE ORDER IN PAYMENTS TABLE
 * ---------------------------------------------------------- */
$stmt = $pdo->prepare(
    'INSERT INTO payments (appointment_id, razorpay_order_id, amount, currency, payment_gateway, payment_status)
     VALUES (:apt_id, :order_id, :amount, :currency, "Razorpay", "Created")'
);
$stmt->execute([
    ':apt_id'   => $appointmentId,
    ':order_id' => $order['id'],
    ':amount'   => $amountINR,
    ':currency' => CURRENCY,
]);

/* ----------------------------------------------------------
 * 7. STORE ORDER IN SESSION
 * ---------------------------------------------------------- */
$_SESSION['razorpay_order_id'] = $order['id'];

/* ----------------------------------------------------------
 * 8. RETURN ORDER DETAILS
 * ---------------------------------------------------------- */
jsonResponse([
    'status'   => 'success',
    'order_id' => $order['id'],
    'amount'   => $amountPaise,
    'currency' => CURRENCY,
    'key'      => RAZORPAY_KEY_ID,
    'name'     => $appointment['full_name'],
    'email'    => $appointment['email'],
    'mobile'   => $appointment['mobile'],
]);
