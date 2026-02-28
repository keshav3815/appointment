<?php
/**
 * ============================================================
 * PHPMailer SMTP Configuration
 * ============================================================
 *
 * Centralised mail-sending function powered by PHPMailer.
 * Uses SMTP with TLS for secure email delivery.
 *
 * REQUIREMENTS:
 *   composer require phpmailer/phpmailer
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Autoload PHPMailer (adjust path if not using Composer)
require_once __DIR__ . '/../vendor/autoload.php';

/* ----------------------------------------------------------
 * SMTP CREDENTIALS — update with your real values
 * ---------------------------------------------------------- */
define('SMTP_HOST',       'smtp.gmail.com');        // SMTP server
define('SMTP_PORT',       587);                      // TLS port
define('SMTP_USERNAME',   'REDACTED_EMAIL');
define('SMTP_PASSWORD',   'REDACTED_PASSWORD');           // ⚠ REPLACE with 16-char App Password from https://myaccount.google.com/apppasswords
define('SMTP_ENCRYPTION', 'tls');                    // tls | ssl
define('SMTP_FROM_EMAIL', 'REDACTED_EMAIL');
define('SMTP_FROM_NAME',  'Doctor Appointment System');
define('SMTP_FALLBACK_NATIVE', true);                // Use PHP mail() as fallback when SMTP fails

/* ----------------------------------------------------------
 * sendMail()  — reusable function for any outbound email
 * ---------------------------------------------------------- */

/**
 * Send an email via SMTP.
 *
 * @param  string $toEmail   Recipient address
 * @param  string $toName    Recipient name
 * @param  string $subject   Email subject
 * @param  string $htmlBody  HTML body content
 * @param  string $altBody   Plain-text fallback (optional)
 * @return bool              True on success
 * @throws Exception         On mail failure
 */
function sendMail(
    string $toEmail,
    string $toName,
    string $subject,
    string $htmlBody,
    string $altBody = ''
): bool {
    $mail = new PHPMailer(true);

    try {
        /* ---- Server settings ---- */
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USERNAME;
        $mail->Password   = SMTP_PASSWORD;
        $mail->SMTPSecure = SMTP_ENCRYPTION === 'ssl'
                                ? PHPMailer::ENCRYPTION_SMTPS
                                : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;
        $mail->Timeout    = 15;

        /* ---- Sender / Recipient ---- */
        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        /* ---- Content ---- */
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody ?: strip_tags($htmlBody);

        $mail->send();
        return true;
    } catch (Exception $e) {
        $smtpError = $mail->ErrorInfo;
        error_log('SMTP send failed: ' . $smtpError);

        /* ---- Fallback: PHP native mail() ---- */
        if (defined('SMTP_FALLBACK_NATIVE') && SMTP_FALLBACK_NATIVE) {
            error_log('Attempting fallback via PHP mail()...');
            try {
                return sendMailNative($toEmail, $toName, $subject, $htmlBody, $altBody);
            } catch (\Exception $nativeEx) {
                // Both methods failed — throw with SMTP error details (more useful)
                throw new \RuntimeException('SMTP: ' . $smtpError . ' | Fallback mail() also failed.');
            }
        }

        throw new \RuntimeException('SMTP: ' . $smtpError);
    }
}

/**
 * Fallback: send email via PHP's built-in mail() function.
 * Works when the server has sendmail / postfix configured.
 */
function sendMailNative(
    string $toEmail,
    string $toName,
    string $subject,
    string $htmlBody,
    string $altBody = ''
): bool {
    $to = $toName ? "{$toName} <{$toEmail}>" : $toEmail;

    $boundary = md5(uniqid((string)time()));
    $headers  = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . SMTP_FROM_EMAIL . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/alternative; boundary=\"" . $boundary . "\"\r\n";

    $plainBody = $altBody ?: strip_tags($htmlBody);

    $body  = "--{$boundary}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
    $body .= $plainBody . "\r\n\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    $body .= $htmlBody . "\r\n\r\n";
    $body .= "--{$boundary}--\r\n";

    $result = @mail($to, $subject, $body, $headers);

    if (!$result) {
        error_log('Native mail() also failed for ' . $toEmail);
        throw new \RuntimeException('All email delivery methods failed for ' . $toEmail);
    }

    error_log('Email sent via native mail() to ' . $toEmail);
    return true;
}

/**
 * Build a styled OTP email body.
 *
 * @param  string $otp  The 6-digit OTP code
 * @return string       HTML email body
 */
function buildOTPEmailBody(string $otp): string
{
    return <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;padding:30px;">
        <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 12px rgba(0,0,0,.08);">
            <h2 style="color:#0d6efd;text-align:center;margin-bottom:10px;">
                Doctor Appointment System
            </h2>
            <p style="text-align:center;color:#555;font-size:15px;">
                Your OTP for email verification:
            </p>
            <div style="text-align:center;margin:25px 0;">
                <span style="display:inline-block;background:#0d6efd;color:#fff;font-size:28px;letter-spacing:8px;padding:14px 30px;border-radius:8px;font-weight:700;">
                    {$otp}
                </span>
            </div>
            <p style="text-align:center;color:#888;font-size:13px;">
                This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="text-align:center;color:#aaa;font-size:12px;">
                If you did not request this, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    HTML;
}

/**
 * Build a styled appointment‑confirmation email body.
 */
function buildConfirmationEmailBody(array $data): string
{
    $name      = htmlspecialchars($data['full_name']      ?? '', ENT_QUOTES, 'UTF-8');
    $aptId     = htmlspecialchars((string)($data['appointment_id'] ?? ''), ENT_QUOTES, 'UTF-8');
    $dept      = htmlspecialchars($data['department']      ?? '', ENT_QUOTES, 'UTF-8');
    $doctor    = htmlspecialchars($data['doctor']          ?? 'Any Available', ENT_QUOTES, 'UTF-8');
    $date      = htmlspecialchars($data['appointment_date'] ?? '', ENT_QUOTES, 'UTF-8');
    $slot      = htmlspecialchars($data['time_slot']       ?? '', ENT_QUOTES, 'UTF-8');
    $txnId     = htmlspecialchars($data['transaction_id']  ?? '', ENT_QUOTES, 'UTF-8');
    $amount    = htmlspecialchars($data['amount']          ?? '', ENT_QUOTES, 'UTF-8');

    return <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fa;padding:30px;">
        <div style="max-width:540px;margin:auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 12px rgba(0,0,0,.08);">
            <h2 style="color:#198754;text-align:center;">✅ Appointment Confirmed</h2>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr><td style="padding:8px;font-weight:600;color:#555;">Appointment ID</td>
                    <td style="padding:8px;color:#333;">#{$aptId}</td></tr>
                <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:600;color:#555;">Patient Name</td>
                    <td style="padding:8px;color:#333;">{$name}</td></tr>
                <tr><td style="padding:8px;font-weight:600;color:#555;">Department</td>
                    <td style="padding:8px;color:#333;">{$dept}</td></tr>
                <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:600;color:#555;">Doctor</td>
                    <td style="padding:8px;color:#333;">{$doctor}</td></tr>
                <tr><td style="padding:8px;font-weight:600;color:#555;">Date</td>
                    <td style="padding:8px;color:#333;">{$date}</td></tr>
                <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:600;color:#555;">Time Slot</td>
                    <td style="padding:8px;color:#333;">{$slot}</td></tr>
                <tr><td style="padding:8px;font-weight:600;color:#555;">Amount Paid</td>
                    <td style="padding:8px;color:#333;">₹{$amount}</td></tr>
                <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:600;color:#555;">Transaction ID</td>
                    <td style="padding:8px;color:#333;">{$txnId}</td></tr>
            </table>
            <p style="text-align:center;color:#888;font-size:13px;">
                Please arrive 15 minutes before your scheduled time. Bring a valid ID.
            </p>
        </div>
    </body>
    </html>
    HTML;
}
