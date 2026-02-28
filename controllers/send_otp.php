<?php
/**
 * ============================================================
 * Controller — Send OTP
 * ============================================================
 *
 * Endpoint : POST /controllers/send_otp.php
 * Accepts  : { email: string }
 * Returns  : JSON { status, message }
 *
 * Workflow:
 *   1. Validate email
 *   2. Rate-limit (max 5 OTPs per email per hour)
 *   3. Generate cryptographically-secure 6-digit OTP
 *   4. Store OTP in database with expiry
 *   5. Send OTP via PHPMailer
 *   6. Return JSON response
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/mail_config.php';

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

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['status' => 'error', 'message' => 'A valid email address is required.'], 422);
}

$email = filter_var($email, FILTER_SANITIZE_EMAIL);

/* ----------------------------------------------------------
 * 3. RATE LIMITING — max 5 OTPs per email in last 60 min
 * ---------------------------------------------------------- */
$pdo = getDBConnection();

$stmt = $pdo->prepare(
    'SELECT COUNT(*) AS cnt
       FROM otp_verification
      WHERE email = :email
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
);
$stmt->execute([':email' => $email]);
$count = (int)$stmt->fetch()['cnt'];

if ($count >= 5) {
    jsonResponse([
        'status'  => 'error',
        'message' => 'Too many OTP requests. Please try again after some time.',
    ], 429);
}

/* ----------------------------------------------------------
 * 4. GENERATE 6-DIGIT OTP
 * ---------------------------------------------------------- */
$otp = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

/* ----------------------------------------------------------
 * 5. INVALIDATE PREVIOUS UNVERIFIED OTPs FOR THIS EMAIL
 * ---------------------------------------------------------- */
$pdo->prepare(
    'DELETE FROM otp_verification WHERE email = :email AND is_verified = 0'
)->execute([':email' => $email]);

/* ----------------------------------------------------------
 * 6. STORE NEW OTP WITH EXPIRY
 * ---------------------------------------------------------- */
$expiryMinutes = defined('OTP_EXPIRY') ? OTP_EXPIRY : 5;

$stmt = $pdo->prepare(
    'INSERT INTO otp_verification (email, otp_code, expiry_time, is_verified)
     VALUES (:email, :otp, DATE_ADD(NOW(), INTERVAL :expiry MINUTE), 0)'
);
$stmt->execute([
    ':email'  => $email,
    ':otp'    => $otp,
    ':expiry' => $expiryMinutes,
]);

/* ----------------------------------------------------------
 * 7. SEND OTP VIA EMAIL (SMTP → native mail() fallback)
 * ---------------------------------------------------------- */
$emailSent = false;
$sendError = '';

try {
    $htmlBody = buildOTPEmailBody($otp);
    sendMail($email, '', 'Your Appointment Verification OTP', $htmlBody);
    $emailSent = true;
} catch (\Exception $e) {
    $sendError = $e->getMessage();
    error_log('OTP email send failed for ' . $email . ': ' . $sendError);
}

/* ----------------------------------------------------------
 * 8. RESPONSE
 * ---------------------------------------------------------- */
$response = [
    'status'  => 'success',
    'message' => $emailSent
        ? 'OTP has been sent to your email address.'
        : 'Email delivery failed. OTP auto-filled for testing.',
];

// DEV MODE: return OTP in response when email fails
if (!$emailSent && defined('DEV_MODE') && DEV_MODE === true) {
    $response['dev_otp'] = $otp;
}

jsonResponse($response);
