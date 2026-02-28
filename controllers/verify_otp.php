<?php
/**
 * ============================================================
 * Controller — Verify OTP
 * ============================================================
 *
 * Endpoint : POST /controllers/verify_otp.php
 * Accepts  : { email: string, otp: string }
 * Returns  : JSON { status, message }
 *
 * Workflow:
 *   1. Validate input
 *   2. Look up OTP from database for the given email
 *   3. Check expiry
 *   4. Mark OTP as verified
 *   5. Store verification flag in session
 *   6. Return success response
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';

/* ----------------------------------------------------------
 * 1. ACCEPT ONLY POST REQUESTS
 * ---------------------------------------------------------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['status' => 'error', 'message' => 'Method not allowed.'], 405);
}

/* ----------------------------------------------------------
 * 2. READ & VALIDATE INPUT
 * ---------------------------------------------------------- */
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$otp   = trim($input['otp']   ?? '');

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['status' => 'error', 'message' => 'A valid email address is required.'], 422);
}

if ($otp === '' || !preg_match('/^\d{6}$/', $otp)) {
    jsonResponse(['status' => 'error', 'message' => 'A valid 6-digit OTP is required.'], 422);
}

/* ----------------------------------------------------------
 * 3. BRUTE-FORCE PROTECTION — max 5 wrong attempts per email in 15 min
 * ---------------------------------------------------------- */
$pdo  = getDBConnection();

$attStmt = $pdo->prepare(
    'SELECT COUNT(*) AS cnt
       FROM otp_verification
      WHERE email = :email
        AND is_verified = 0
        AND attempts >= 5
        AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)'
);
$attStmt->execute([':email' => $email]);
if ((int)$attStmt->fetch()['cnt'] > 0) {
    jsonResponse(['status' => 'error', 'message' => 'Too many wrong attempts. Please request a new OTP.'], 429);
}

/* ----------------------------------------------------------
 * 4. LOOK UP OTP IN DATABASE
 * ---------------------------------------------------------- */
$stmt = $pdo->prepare(
    'SELECT otp_id, otp_code, expiry_time, is_verified, attempts
       FROM otp_verification
      WHERE email    = :email
        AND is_verified = 0
      ORDER BY created_at DESC
      LIMIT 1'
);
$stmt->execute([':email' => $email]);
$record = $stmt->fetch();

if (!$record) {
    jsonResponse(['status' => 'error', 'message' => 'No OTP found. Please request a new one.'], 400);
}

/* ----------------------------------------------------------
 * 5. CHECK EXPIRY
 * ---------------------------------------------------------- */
$expiry = new DateTime($record['expiry_time']);
$now    = new DateTime();

if ($now > $expiry) {
    // Clean up expired OTP
    $pdo->prepare('DELETE FROM otp_verification WHERE otp_id = :id')
        ->execute([':id' => $record['otp_id']]);

    jsonResponse(['status' => 'error', 'message' => 'OTP has expired. Please request a new one.'], 400);
}

/* ----------------------------------------------------------
 * 6. VERIFY OTP — constant-time comparison to prevent timing attacks
 * ---------------------------------------------------------- */
if (!hash_equals($record['otp_code'], $otp)) {
    // Increment attempt counter
    $pdo->prepare('UPDATE otp_verification SET attempts = attempts + 1 WHERE otp_id = :id')
        ->execute([':id' => $record['otp_id']]);

    $attemptsLeft = 5 - ((int)$record['attempts'] + 1);
    $msg = $attemptsLeft > 0
        ? "Invalid OTP. {$attemptsLeft} attempt(s) remaining."
        : 'Too many wrong attempts. Please request a new OTP.';

    jsonResponse(['status' => 'error', 'message' => $msg], 400);
}

/* ----------------------------------------------------------
 * 7. MARK OTP AS VERIFIED
 * ---------------------------------------------------------- */
$pdo->prepare('UPDATE otp_verification SET is_verified = 1 WHERE otp_id = :id')
    ->execute([':id' => $record['otp_id']]);

/* ----------------------------------------------------------
 * 7. STORE VERIFICATION IN SESSION
 * ---------------------------------------------------------- */
$_SESSION['otp_verified']       = true;
$_SESSION['otp_verified_email'] = $email;
$_SESSION['otp_verified_at']    = time();

/* ----------------------------------------------------------
 * 8. SUCCESS RESPONSE
 * ---------------------------------------------------------- */
jsonResponse([
    'status'  => 'success',
    'message' => 'Email verified successfully.',
]);
