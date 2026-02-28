<?php
/**
 * ============================================================
 * Application Configuration & Database Connection (PDO)
 * ============================================================
 *
 * - Secure PDO connection with error handling
 * - Centralised constants for Razorpay & app settings
 * - Session configuration
 */

declare(strict_types=1);

/* ----------------------------------------------------------
 * 1. ERROR REPORTING (disable display in production)
 * ---------------------------------------------------------- */
ini_set('display_errors', '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/* Development mode — set to false in production */
define('DEV_MODE', true);

/* ----------------------------------------------------------
 * 2. SESSION — start only when not already active
 * ---------------------------------------------------------- */
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure'   => isset($_SERVER['HTTPS']),  // true when HTTPS
        'cookie_samesite' => 'Strict',
        'use_strict_mode' => true,
    ]);
}

/* ----------------------------------------------------------
 * 3. DATABASE CREDENTIALS
 * ---------------------------------------------------------- */
define('DB_HOST',    'localhost');
define('DB_NAME',    'appointment_system');
define('DB_USER',    'root');               // change in production
define('DB_PASS',    '');                    // change in production
define('DB_CHARSET', 'utf8mb4');

/* ----------------------------------------------------------
 * 4. RAZORPAY CREDENTIALS
 * ---------------------------------------------------------- */
define('RAZORPAY_KEY_ID',     'rzp_test_XXXXXXXXXXXXXXX');   // replace with your key
define('RAZORPAY_KEY_SECRET', 'XXXXXXXXXXXXXXXXXXXXXXXX');    // replace with your secret
define('CONSULTATION_FEE',    500);                           // amount in INR
define('CURRENCY',            'INR');

/* ----------------------------------------------------------
 * 5. APPLICATION SETTINGS
 * ---------------------------------------------------------- */
define('APP_NAME',   'Doctor Appointment Booking System');
define('APP_URL',    'http://localhost/appointment');          // base URL — no trailing slash
define('OTP_EXPIRY', 5);                                      // OTP expiry in minutes

/* ----------------------------------------------------------
 * 6. PDO CONNECTION
 * ---------------------------------------------------------- */
function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4'",
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Internal server error. Please try again later.',
            ]);
            exit;
        }
    }

    return $pdo;
}

/* ----------------------------------------------------------
 * 7. CSRF TOKEN HELPERS
 * ---------------------------------------------------------- */

/**
 * Generate a new CSRF token and store it in session + database.
 */
function generateCSRFToken(): string
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;

    // Also persist in DB so it can be validated across requests
    try {
        $pdo  = getDBConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO csrf_tokens (token, expires_at) VALUES (:token, DATE_ADD(NOW(), INTERVAL 1 HOUR))'
        );
        $stmt->execute([':token' => $token]);
    } catch (PDOException $e) {
        error_log('CSRF token store failed: ' . $e->getMessage());
    }

    return $token;
}

/**
 * Validate a submitted CSRF token.
 * Token is NOT consumed here — it stays valid until expiry (1 hour)
 * so the user can retry if a downstream step fails.
 */
function validateCSRFToken(string $token): bool
{
    // Check session first
    if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        return false;
    }

    // Verify it exists in DB and not expired
    try {
        $pdo  = getDBConnection();
        $stmt = $pdo->prepare(
            'SELECT token_id FROM csrf_tokens WHERE token = :token AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([':token' => $token]);

        if ($stmt->fetch()) {
            return true;
        }
    } catch (PDOException $e) {
        error_log('CSRF validation failed: ' . $e->getMessage());
    }

    return false;
}

/* ----------------------------------------------------------
 * 8. INPUT SANITISATION HELPER
 * ---------------------------------------------------------- */

/**
 * Sanitise a string for safe HTML output (XSS protection).
 */
function sanitise(string $input): string
{
    return htmlspecialchars(trim($input), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/**
 * Send a JSON response and exit.
 */
function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
