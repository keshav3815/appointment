<?php
/**
 * ============================================================
 * Controller — Payment Success (Razorpay Callback)
 * ============================================================
 *
 * Endpoint : POST /controllers/payment_success.php
 * Accepts  : { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns  : JSON { status, message, redirect }
 *
 * Workflow:
 *   1. Receive Razorpay callback data
 *   2. Verify payment signature (HMAC SHA256)
 *   3. Update payment record
 *   4. Update appointment payment_status + status
 *   5. Send confirmation email
 *   6. Return redirect URL
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/mail_config.php';

/* ----------------------------------------------------------
 * 1. POST ONLY
 * ---------------------------------------------------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['status' => 'error', 'message' => 'Method not allowed.'], 405);
}

/* ----------------------------------------------------------
 * 2. READ INPUT
 * ---------------------------------------------------------- */
$input = json_decode(file_get_contents('php://input'), true);

$razorpayOrderId   = trim($input['razorpay_order_id']   ?? '');
$razorpayPaymentId = trim($input['razorpay_payment_id'] ?? '');
$razorpaySignature = trim($input['razorpay_signature']  ?? '');

if ($razorpayOrderId === '' || $razorpayPaymentId === '' || $razorpaySignature === '') {
    jsonResponse(['status' => 'error', 'message' => 'Missing payment verification data.'], 422);
}

/* ----------------------------------------------------------
 * 3. VERIFY RAZORPAY SIGNATURE
 *    signature = HMAC-SHA256( order_id + "|" + payment_id, secret )
 * ---------------------------------------------------------- */
$expectedSignature = hash_hmac(
    'sha256',
    $razorpayOrderId . '|' . $razorpayPaymentId,
    RAZORPAY_KEY_SECRET
);

if (!hash_equals($expectedSignature, $razorpaySignature)) {
    error_log("Payment signature mismatch for order {$razorpayOrderId}");
    jsonResponse(['status' => 'error', 'message' => 'Payment verification failed. Signature mismatch.'], 400);
}

/* ----------------------------------------------------------
 * 4. FETCH PAYMENT RECORD
 * ---------------------------------------------------------- */
$pdo  = getDBConnection();
$stmt = $pdo->prepare(
    'SELECT p.payment_id, p.appointment_id, p.amount
       FROM payments p
      WHERE p.razorpay_order_id = :order_id
      LIMIT 1'
);
$stmt->execute([':order_id' => $razorpayOrderId]);
$payment = $stmt->fetch();

if (!$payment) {
    jsonResponse(['status' => 'error', 'message' => 'Payment record not found.'], 404);
}

/* ----------------------------------------------------------
 * 5. UPDATE DATABASE — TRANSACTION
 * ---------------------------------------------------------- */
try {
    $pdo->beginTransaction();

    // 5a. Update payment record
    $pdo->prepare(
        'UPDATE payments
            SET transaction_id     = :txn_id,
                razorpay_signature = :sig,
                payment_status     = "Captured"
          WHERE payment_id = :pid'
    )->execute([
        ':txn_id' => $razorpayPaymentId,
        ':sig'    => $razorpaySignature,
        ':pid'    => $payment['payment_id'],
    ]);

    // 5b. Update appointment status
    $pdo->prepare(
        'UPDATE appointments
            SET payment_status = "Paid",
                status         = "Confirmed"
          WHERE appointment_id = :aid'
    )->execute([':aid' => $payment['appointment_id']]);

    $pdo->commit();

} catch (\PDOException $e) {
    $pdo->rollBack();
    error_log('Payment update failed: ' . $e->getMessage());
    jsonResponse(['status' => 'error', 'message' => 'Failed to update payment records.'], 500);
}

/* ----------------------------------------------------------
 * 6. FETCH FULL DETAILS FOR CONFIRMATION EMAIL
 * ---------------------------------------------------------- */
$stmt = $pdo->prepare(
    'SELECT a.appointment_id, a.department, a.doctor, a.appointment_date,
            a.time_slot, a.appointment_type,
            p2.full_name, p2.email, p2.mobile,
            py.amount, py.transaction_id
       FROM appointments a
       JOIN patients p2 ON p2.patient_id = a.patient_id
       JOIN payments py ON py.appointment_id = a.appointment_id
      WHERE a.appointment_id = :aid
      LIMIT 1'
);
$stmt->execute([':aid' => $payment['appointment_id']]);
$details = $stmt->fetch();

/* ----------------------------------------------------------
 * 7. SEND CONFIRMATION EMAIL
 * ---------------------------------------------------------- */
if ($details) {
    try {
        $htmlBody = buildConfirmationEmailBody($details);
        sendMail(
            $details['email'],
            $details['full_name'],
            'Appointment Confirmed — #' . $details['appointment_id'],
            $htmlBody
        );
    } catch (\Exception $e) {
        // Log but do not fail the payment flow
        error_log('Confirmation email failed: ' . $e->getMessage());
    }
}

/* ----------------------------------------------------------
 * 8. UPDATE SESSION
 * ---------------------------------------------------------- */
$_SESSION['payment_verified']   = true;
$_SESSION['transaction_id']     = $razorpayPaymentId;
$_SESSION['appointment_id']     = $payment['appointment_id'];

/* ----------------------------------------------------------
 * 9. SUCCESS RESPONSE
 * ---------------------------------------------------------- */
jsonResponse([
    'status'   => 'success',
    'message'  => 'Payment verified and appointment confirmed.',
    'redirect' => 'views/success.php',
]);
