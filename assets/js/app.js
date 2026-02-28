/**
 * ============================================================
 * Doctor Appointment Booking — Multi-Step Wizard Logic
 * ============================================================
 *
 * Step 1 → Patient Details & Address (+ OTP)
 * Step 2 → Appointment Details
 * Step 3 → Reason for Visit
 * Step 4 → Review & Razorpay Payment
 *          → On payment success: create appointment → redirect success page
 */

'use strict';

/* ==============================================================
 * DOM REFERENCES
 * ============================================================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const form          = $('#appointmentForm');
const globalAlert   = $('#globalAlert');
const sendOtpBtn    = $('#sendOtpBtn');
const verifyOtpBtn  = $('#verifyOtpBtn');
const otpBox        = $('#otpBox');
const otpInput      = $('#otpInput');
const otpMsg        = $('#otpMsg');
const emailField    = $('#email');
const dobField      = $('#dob');
const ageField      = $('#age');
const payNowBtn     = $('#payNowBtn');

const TOTAL_STEPS = 4;
let currentStep   = 1;
let otpVerified   = false;
let otpCooldown   = false;
let appointmentCreated = false;  // prevent double submission

/* ==============================================================
 * UTILITY — Alerts
 * ============================================================== */
function showAlert(msg, type = 'danger', duration = 5000) {
    globalAlert.className = `alert alert-${type}`;
    globalAlert.innerHTML = msg;
    globalAlert.classList.remove('d-none');
    if (duration > 0) {
        setTimeout(() => globalAlert.classList.add('d-none'), duration);
    }
}

function hideAlert() {
    globalAlert.classList.add('d-none');
}

function showOtpMsg(msg, type = 'danger') {
    otpMsg.innerHTML = `<small class="text-${type}" style="font-weight:500;">${msg}</small>`;
}

/* ==============================================================
 * STEP NAVIGATION
 * ============================================================== */
function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;

    hideAlert();

    // Hide all panels, show target
    $$('.step-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = $(`#stepPanel${step}`);
    if (targetPanel) targetPanel.classList.add('active');

    // Update progress bar
    $$('.step-item').forEach(item => {
        const s = parseInt(item.dataset.step);
        item.classList.remove('active', 'completed');
        if (s < step)  item.classList.add('completed');
        if (s === step) item.classList.add('active');
    });

    $$('.step-connector').forEach(conn => {
        const c = parseInt(conn.dataset.connector);
        conn.classList.toggle('completed', c < step);
    });

    currentStep = step;

    // Populate summary on step 4
    if (step === 4) populateSummary();

    // Scroll to top of card
    document.querySelector('.appointment-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ==============================================================
 * STEP VALIDATION
 * ============================================================== */
function validateStep(step) {
    let valid = true;

    const markInvalid = (el, msg) => {
        el.classList.add('is-invalid');
        valid = false;
    };
    const markValid = (el) => el.classList.remove('is-invalid');

    if (step === 1) {
        // Full name
        const name = $('#full_name');
        if (!name.value.trim() || name.value.trim().length < 2) markInvalid(name);
        else markValid(name);

        // Mobile
        const mobile = $('#mobile');
        if (!/^[6-9]\d{9}$/.test(mobile.value.trim())) markInvalid(mobile);
        else markValid(mobile);

        // Email
        if (!emailField.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
            markInvalid(emailField);
        } else markValid(emailField);

        // Gender
        if (!$('input[name="gender"]:checked')) {
            showAlert('<i class="fa-solid fa-exclamation-triangle"></i> Please select a gender.', 'warning');
            valid = false;
        }

        // DOB
        if (!dobField.value) markInvalid(dobField);
        else {
            const d = new Date(dobField.value);
            if (d > new Date()) markInvalid(dobField);
            else markValid(dobField);
        }

        // OTP verified
        if (!otpVerified) {
            showAlert('<i class="fa-solid fa-shield-halved"></i> Please verify your email with OTP before proceeding.', 'warning');
            valid = false;
        }

        // City
        const city = $('#city');
        if (!city.value.trim()) markInvalid(city);
        else markValid(city);

        // State
        const state = $('#state');
        if (!state.value) markInvalid(state);
        else markValid(state);
    }

    if (step === 2) {
        const dept = $('#department');
        if (!dept.value) markInvalid(dept);
        else markValid(dept);

        const aptDate = $('#appointment_date');
        if (!aptDate.value) markInvalid(aptDate);
        else {
            const d = new Date(aptDate.value);
            const today = new Date(); today.setHours(0,0,0,0);
            if (d < today) markInvalid(aptDate);
            else markValid(aptDate);
        }

        const slot = $('#time_slot');
        if (!slot.value) markInvalid(slot);
        else markValid(slot);

        if (!$('input[name="appointment_type"]:checked')) {
            showAlert('<i class="fa-solid fa-exclamation-triangle"></i> Select appointment type (New / Follow-up).', 'warning');
            valid = false;
        }
    }

    if (step === 3) {
        const reason = $('#reason');
        if (!reason.value) markInvalid(reason);
        else markValid(reason);
    }

    return valid;
}

/* ==============================================================
 * POPULATE PAYMENT SUMMARY
 * ============================================================== */
function populateSummary() {
    $('#sumName').textContent   = $('#full_name').value.trim();
    $('#sumEmail').textContent  = emailField.value.trim();
    $('#sumMobile').textContent = $('#mobile').value.trim();
    $('#sumDept').textContent   = $('#department').value || '—';
    $('#sumDoctor').textContent = $('#doctor').value || 'Any Available';
    $('#sumDate').textContent   = $('#appointment_date').value || '—';
    $('#sumSlot').textContent   = $('#time_slot').value || '—';
    $('#sumType').textContent   = ($('input[name="appointment_type"]:checked') || {}).value || '—';
    $('#sumReason').textContent = $('#reason').value || '—';
}

/* ==============================================================
 * AGE CALCULATION
 * ============================================================== */
dobField.addEventListener('change', function () {
    const dob = new Date(this.value);
    if (isNaN(dob.getTime())) { ageField.value = ''; return; }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    ageField.value = age >= 0 ? age + ' years' : '';
});

/* ==============================================================
 * DATE CONSTRAINTS
 * ============================================================== */
(function setDateConstraints() {
    const today = new Date().toISOString().split('T')[0];
    const aptDate = $('#appointment_date');
    if (aptDate) aptDate.setAttribute('min', today);
    if (dobField) dobField.setAttribute('max', today);
})();

/* ==============================================================
 * SEND OTP
 * ============================================================== */
sendOtpBtn.addEventListener('click', async () => {
    const email = emailField.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailField.classList.add('is-invalid');
        return;
    }
    emailField.classList.remove('is-invalid');

    if (otpCooldown) {
        showAlert('Please wait before requesting another OTP.', 'warning');
        return;
    }

    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

    try {
        const res  = await fetch('controllers/send_otp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.status === 'success') {
            otpBox.style.display = 'block';

            // DEV MODE: auto-fill OTP when email fails
            if (data.dev_otp) {
                otpInput.value = data.dev_otp;
                showOtpMsg(
                    '<i class="fa-solid fa-triangle-exclamation"></i> Email failed. OTP auto-filled: <strong>' + data.dev_otp + '</strong>',
                    'warning'
                );
            } else {
                otpInput.value = '';
                otpInput.focus();
                showOtpMsg('<i class="fa-solid fa-check-circle"></i> OTP sent to ' + email + '. Check inbox & spam.', 'success');
            }

            // 60-second cooldown
            otpCooldown = true;
            let sec = 60;
            const timer = setInterval(() => {
                sec--;
                sendOtpBtn.innerHTML = `Resend (${sec}s)`;
                if (sec <= 0) {
                    clearInterval(timer);
                    otpCooldown = false;
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Resend OTP';
                }
            }, 1000);
        } else {
            showAlert('<i class="fa-solid fa-circle-exclamation"></i> ' + (data.message || 'Failed to send OTP. Please try again.'), 'danger', 8000);
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
        }
    } catch (err) {
        console.error(err);
        showAlert('Network error. Please try again.');
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send OTP';
    }
});

/* ==============================================================
 * VERIFY OTP
 * ============================================================== */
verifyOtpBtn.addEventListener('click', async () => {
    const email = emailField.value.trim();
    const otp   = otpInput.value.trim();

    if (!/^\d{6}$/.test(otp)) {
        showOtpMsg('Enter a valid 6-digit OTP.', 'danger');
        return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';

    try {
        const res  = await fetch('controllers/verify_otp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();

        if (data.status === 'success') {
            otpVerified = true;

            // Hide OTP box, show verified badge
            otpBox.style.display = 'none';
            $('#emailVerifiedBadge').style.display = 'block';

            // Lock email field
            emailField.readOnly  = true;
            sendOtpBtn.disabled  = true;
            sendOtpBtn.style.display = 'none';
        } else {
            showOtpMsg(data.message || 'Invalid OTP.', 'danger');
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify';
        }
    } catch (err) {
        console.error(err);
        showOtpMsg('Network error. Please try again.', 'danger');
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify';
    }
});

/* ==============================================================
 * NAVIGATION BUTTON HANDLERS
 * ============================================================== */
$('#nextToStep2').addEventListener('click', () => { if (validateStep(1)) goToStep(2); });
$('#nextToStep3').addEventListener('click', () => { if (validateStep(2)) goToStep(3); });
$('#nextToStep4').addEventListener('click', () => { if (validateStep(3)) goToStep(4); });

$('#backToStep1').addEventListener('click', () => goToStep(1));
$('#backToStep2').addEventListener('click', () => goToStep(2));
$('#backToStep3').addEventListener('click', () => goToStep(3));

/* ==============================================================
 * PAY NOW — Full Workflow
 *   1. Create appointment (POST)
 *   2. Create Razorpay order (POST)
 *   3. Open Razorpay checkout
 *   4. Verify payment (POST)
 *   5. Redirect to success page
 * ============================================================== */
payNowBtn.addEventListener('click', async () => {

    if (appointmentCreated) return;  // prevent double click

    payNowBtn.disabled = true;
    payNowBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing…';

    const fee = parseFloat($('#consultation_fee').value);

    /* ---- STEP A: Build payload & create appointment ---- */
    const payload = {
        csrf_token:       $('#csrf_token').value,
        full_name:        $('#full_name').value.trim(),
        mobile:           $('#mobile').value.trim(),
        email:            emailField.value.trim(),
        gender:           ($('input[name="gender"]:checked') || {}).value || '',
        dob:              dobField.value,
        society:          $('#society').value.trim(),
        city:             $('#city').value.trim(),
        state:            $('#state').value,
        department:       $('#department').value,
        doctor:           $('#doctor').value,
        appointment_date: $('#appointment_date').value,
        time_slot:        $('#time_slot').value,
        appointment_type: ($('input[name="appointment_type"]:checked') || {}).value || '',
        reason:           $('#reason').value,
        symptoms:         $('#symptoms').value.trim(),
        duration:         $('#duration').value,
    };

    let appointmentId;

    try {
        const aptRes  = await fetch('controllers/create_appointment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const aptData = await aptRes.json();

        if (aptData.status !== 'success') {
            showAlert(aptData.message || 'Appointment creation failed.');
            resetPayBtn();
            return;
        }

        appointmentId = aptData.appointment_id;
        appointmentCreated = true;

    } catch (err) {
        console.error(err);
        showAlert('Network error creating appointment. Please try again.');
        resetPayBtn();
        return;
    }

    /* ---- STEP B: Create Razorpay order ---- */
    let orderData;

    try {
        const ordRes = await fetch('controllers/create_payment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_id: appointmentId })
        });
        orderData = await ordRes.json();

        if (orderData.status !== 'success') {
            showAlert(orderData.message || 'Payment order creation failed.');
            resetPayBtn();
            return;
        }
    } catch (err) {
        console.error(err);
        showAlert('Network error creating payment order.');
        resetPayBtn();
        return;
    }

    /* ---- STEP C: Open Razorpay Checkout ---- */
    payNowBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Complete Payment…';

    const options = {
        key:       orderData.key,
        amount:    orderData.amount,
        currency:  orderData.currency,
        order_id:  orderData.order_id,
        name:      'Doctor Appointment System',
        description: 'Consultation Fee — Appointment #' + appointmentId,
        prefill: {
            name:    orderData.name   || '',
            email:   orderData.email  || '',
            contact: orderData.mobile || ''
        },
        theme: { color: '#4f46e5' },

        /* ---- STEP D: Payment success handler ---- */
        handler: async function (response) {
            payNowBtn.disabled = true;
            payNowBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Payment…';

            try {
                const vRes = await fetch('controllers/payment_success.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id:   response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature:  response.razorpay_signature
                    })
                });
                const vData = await vRes.json();

                if (vData.status === 'success') {
                    // Redirect to success page
                    window.location.href = vData.redirect || 'views/success.php';
                } else {
                    showAlert(vData.message || 'Payment verification failed.');
                    resetPayBtn();
                }
            } catch (err) {
                console.error(err);
                showAlert('Payment verification error. Contact support.');
                resetPayBtn();
            }
        },

        modal: {
            ondismiss: function () {
                showAlert('Payment was not completed. You can retry.', 'warning');
                resetPayBtn();
            }
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
});

function resetPayBtn() {
    const fee = parseFloat($('#consultation_fee').value);
    payNowBtn.disabled = false;
    payNowBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pay ₹${fee.toFixed(2)}`;
}

/* ==============================================================
 * PREVENT FORM SUBMIT (enter key)
 * ============================================================== */
form.addEventListener('submit', e => e.preventDefault());

/* ==============================================================
 * CLEAR VALIDATION ON INPUT
 * ============================================================== */
$$('.form-control, .form-select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('is-invalid'));
    el.addEventListener('change', () => el.classList.remove('is-invalid'));
});
