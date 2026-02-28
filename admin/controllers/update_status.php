<?php
/**
 * Admin API — Update Appointment Status
 */
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/config/config.php';
require_once dirname(__DIR__) . '/auth_check.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method not allowed', 405);
}

$appointmentId = (int)($_POST['appointment_id'] ?? 0);
$field         = $_POST['field'] ?? '';
$value         = $_POST['value'] ?? '';

// Whitelist fields and values
$allowed = [
    'status'         => ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    'payment_status' => ['Pending', 'Completed', 'Failed', 'Refunded'],
];

if ($appointmentId <= 0) {
    jsonResponse(false, 'Invalid appointment ID');
}
if (!isset($allowed[$field])) {
    jsonResponse(false, 'Invalid field');
}
if (!in_array($value, $allowed[$field])) {
    jsonResponse(false, 'Invalid value for ' . $field);
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare("UPDATE appointments SET {$field} = ? WHERE appointment_id = ?");
    $stmt->execute([$value, $appointmentId]);

    if ($stmt->rowCount() > 0) {
        jsonResponse(true, ucfirst(str_replace('_', ' ', $field)) . ' updated');
    } else {
        jsonResponse(false, 'Appointment not found or value unchanged');
    }
} catch (PDOException $e) {
    jsonResponse(false, 'Database error: ' . $e->getMessage());
}
