<?php
/**
 * ============================================================
 * View — Appointment Confirmation / Success Page
 * ============================================================
 *
 * Premium design matching the multi-step wizard.
 * Shows: Appointment ID, Patient, Doctor, Payment Status, etc.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

/* ----------------------------------------------------------
 * SESSION GUARD
 * ---------------------------------------------------------- */
if (empty($_SESSION['appointment_id']) || empty($_SESSION['payment_verified'])) {
    header('Location: ../index.php');
    exit;
}

$appointmentId = (int)$_SESSION['appointment_id'];

/* ----------------------------------------------------------
 * FETCH DETAILS
 * ---------------------------------------------------------- */
$pdo  = getDBConnection();
$stmt = $pdo->prepare(
    'SELECT a.appointment_id, a.department, a.doctor, a.appointment_date,
            a.time_slot, a.appointment_type, a.reason, a.status,
            a.payment_status AS apt_payment_status,
            p.full_name, p.email, p.mobile, p.gender, p.age,
            py.transaction_id, py.amount, py.payment_status AS pay_status,
            py.razorpay_order_id
       FROM appointments a
       JOIN patients p  ON p.patient_id     = a.patient_id
       JOIN payments py ON py.appointment_id = a.appointment_id
      WHERE a.appointment_id = :id
      ORDER BY py.created_at DESC
      LIMIT 1'
);
$stmt->execute([':id' => $appointmentId]);
$data = $stmt->fetch();

if (!$data) {
    echo '<p class="text-danger text-center mt-5">Appointment details not found.</p>';
    exit;
}

/* Clear sensitive session data */
unset(
    $_SESSION['otp_verified'],
    $_SESSION['otp_verified_email'],
    $_SESSION['otp_verified_at'],
    $_SESSION['razorpay_order_id'],
    $_SESSION['payment_verified']
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Appointment Confirmed — <?= APP_NAME ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">

    <style>
        .success-card {
            border-radius: var(--radius-lg);
            border: 1px solid rgba(255,255,255,0.5);
            background: var(--card-bg);
            box-shadow: var(--shadow-card);
            backdrop-filter: blur(var(--glass-blur));
            max-width: 660px;
            margin: 40px auto;
            overflow: hidden;
            position: relative;
            z-index: 1;
        }
        .success-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--success), #34d399, var(--accent));
        }
        .check-circle {
            width: 88px; height: 88px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--success), #34d399);
            color: #fff;
            font-size: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
            box-shadow: 0 8px 28px rgba(16,185,129,0.25);
            animation: popIn 0.6s cubic-bezier(.4,0,.2,1);
        }
        @keyframes popIn {
            0%   { transform: scale(0); opacity: 0; }
            60%  { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
        }
        .detail-table td {
            padding: 10px 16px;
            vertical-align: middle;
            font-size: 0.93rem;
        }
        .detail-table tr:nth-child(even) { background: rgba(79,70,229,0.03); }
        .detail-table .label-cell {
            font-weight: 600;
            color: var(--muted);
            width: 44%;
            white-space: nowrap;
        }
        .detail-table .label-cell i {
            color: var(--primary);
            width: 20px;
            text-align: center;
            margin-right: 8px;
        }
        .detail-table .value-cell {
            font-weight: 600;
            color: var(--dark);
        }
        .badge-paid {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: var(--success-bg);
            color: var(--success);
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
        }
        .badge-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: var(--primary-bg);
            color: var(--primary);
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
        }
        .apt-id-box {
            background: linear-gradient(135deg, var(--primary-bg), #f0f9ff);
            border: 1.5px solid rgba(79,70,229,0.12);
            border-radius: var(--radius-md);
            padding: 14px 20px;
            text-align: center;
            margin-bottom: 20px;
        }
        .apt-id-box .apt-id {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: 1px;
        }
        @media print {
            .no-print { display: none !important; }
            body { background: #fff; }
            .success-card { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>

<div class="container py-4 py-md-5">
<div class="success-card">
<div class="card-body p-4 p-md-5">

    <!-- Check icon -->
    <div class="check-circle">
        <i class="fa-solid fa-check"></i>
    </div>

    <h3 class="text-center fw-bold mb-1" style="color:var(--success);">Appointment Confirmed!</h3>
    <p class="text-center text-muted mb-4" style="font-size:0.9rem;">
        Your appointment has been booked and payment received successfully.
    </p>

    <!-- Appointment ID highlight -->
    <div class="apt-id-box">
        <div class="text-muted" style="font-size:0.82rem;font-weight:600;">Appointment ID</div>
        <div class="apt-id">#<?= (int)$data['appointment_id'] ?></div>
    </div>

    <!-- Details table -->
    <div class="table-responsive">
    <table class="table detail-table mb-0">
        <tr>
            <td class="label-cell"><i class="fa-solid fa-user"></i> Patient</td>
            <td class="value-cell"><?= sanitise($data['full_name']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-envelope"></i> Email</td>
            <td class="value-cell"><?= sanitise($data['email']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-phone"></i> Mobile</td>
            <td class="value-cell"><?= sanitise($data['mobile']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-hospital"></i> Department</td>
            <td class="value-cell"><?= sanitise($data['department']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-user-doctor"></i> Doctor</td>
            <td class="value-cell"><?= sanitise($data['doctor'] ?: 'Any Available') ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-calendar"></i> Date</td>
            <td class="value-cell"><?= sanitise($data['appointment_date']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-clock"></i> Time Slot</td>
            <td class="value-cell"><?= sanitise($data['time_slot']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-stethoscope"></i> Type</td>
            <td class="value-cell"><?= sanitise($data['appointment_type']) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-indian-rupee-sign"></i> Amount</td>
            <td class="value-cell" style="font-weight:700;color:var(--primary);">₹<?= number_format((float)$data['amount'], 2) ?></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-receipt"></i> Transaction ID</td>
            <td class="value-cell"><code style="font-size:0.85rem;color:var(--muted);"><?= sanitise($data['transaction_id'] ?? '—') ?></code></td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-circle-check"></i> Payment</td>
            <td class="value-cell">
                <?php if ($data['apt_payment_status'] === 'Paid'): ?>
                    <span class="badge-paid"><i class="fa-solid fa-check"></i> Paid</span>
                <?php else: ?>
                    <span class="badge-status"><?= sanitise($data['apt_payment_status']) ?></span>
                <?php endif; ?>
            </td>
        </tr>
        <tr>
            <td class="label-cell"><i class="fa-solid fa-flag"></i> Status</td>
            <td class="value-cell">
                <span class="badge-status"><i class="fa-solid fa-check-double"></i> <?= sanitise($data['status']) ?></span>
            </td>
        </tr>
    </table>
    </div>

    <!-- Actions -->
    <div class="text-center mt-4 no-print">
        <button class="btn btn-outline-secondary me-2" onclick="window.print()" style="border-radius:var(--radius-sm);">
            <i class="fa-solid fa-print"></i> Print
        </button>
        <a href="../index.php" class="btn btn-primary" style="border-radius:var(--radius-sm);padding:10px 24px;">
            <i class="fa-solid fa-plus"></i> Book Another
        </a>
    </div>

    <div class="text-center mt-3">
        <small class="text-muted">
            <i class="fa-solid fa-envelope"></i>
            Confirmation email sent to <strong><?= sanitise($data['email']) ?></strong>
        </small>
    </div>

</div>
</div>
</div>

</body>
</html>
