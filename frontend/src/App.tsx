import { Routes, Route } from "react-router-dom";

import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";

import { PatientAuthProvider } from "./context/PatientAuthContext";
import { RequirePatientAuth } from "./components/patient/RequirePatientAuth";

import { DoctorAuthProvider } from "./context/DoctorAuthContext";
import { DoctorLayout } from "./components/doctor/DoctorLayout";
import { DoctorProtectedRoute } from "./components/doctor/DoctorProtectedRoute";

import { WizardLayout } from "./components/wizard/WizardLayout";

import { LandingPage } from "./pages/patient/LandingPage";
import { PatientLoginPage } from "./pages/patient/LoginPage";
import { SignupPage } from "./pages/patient/SignupPage";
import { ForgotPasswordPage } from "./pages/patient/ForgotPasswordPage";
import { DoctorListingPage } from "./pages/patient/DoctorListingPage";
import { DoctorProfilePage } from "./pages/patient/DoctorProfilePage";
import { AccountPage } from "./pages/patient/AccountPage";
import { VideoRoomPage } from "./pages/patient/VideoRoomPage";
import { BookingWizardPage } from "./pages/patient/BookingWizardPage";
import { SuccessPage } from "./pages/patient/SuccessPage";

import { DoctorLoginPage } from "./pages/doctor/DoctorLoginPage";
import { DoctorDashboardPage } from "./pages/doctor/DoctorDashboardPage";

import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { AppointmentsPage } from "./pages/admin/AppointmentsPage";
import { PatientsPage } from "./pages/admin/PatientsPage";
import { PaymentsPage } from "./pages/admin/PaymentsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";

function App() {
  return (
    <PatientAuthProvider>
      <Routes>
        {/* =========================
            PATIENT: PUBLIC
        ========================= */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PatientLoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/video/:appointmentId" element={<VideoRoomPage />} />

        {/* =========================
            PATIENT: REQUIRES LOGIN
            (search → doctor listing/profile → booking → account)
        ========================= */}
        <Route element={<RequirePatientAuth />}>
          <Route path="/doctors" element={<DoctorListingPage />} />
          <Route path="/doctors/:doctorId" element={<DoctorProfilePage />} />
          <Route path="/account" element={<AccountPage />} />

          {/* Existing Patient Appointment Form — unchanged, now reachable
              both directly and pre-filled from a doctor's profile page. */}
          <Route element={<WizardLayout />}>
            <Route path="/book" element={<BookingWizardPage />} />
            <Route path="/success" element={<SuccessPage />} />
          </Route>
        </Route>

        {/* =========================
            DOCTOR PORTAL
        ========================= */}
        <Route
          path="/doctor/*"
          element={
            <DoctorAuthProvider>
              <DoctorLayout />
            </DoctorAuthProvider>
          }
        >
          <Route path="login" element={<DoctorLoginPage />} />
          <Route element={<DoctorProtectedRoute />}>
            <Route index element={<DoctorDashboardPage />} />
          </Route>
        </Route>

        {/* =========================
            ADMIN PANEL
        ========================= */}
        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <AdminLayout />
            </AdminAuthProvider>
          }
        >
          {/* Admin Login */}
          <Route path="login" element={<LoginPage />} />

          {/* =========================
              PROTECTED ADMIN PAGES
          ========================= */}
          <Route element={<ProtectedRoute />}>
            {/* Dashboard */}
            <Route index element={<DashboardPage />} />

            {/* All Appointments */}
            <Route path="appointments" element={<AppointmentsPage />} />

            {/* Patients */}
            <Route path="patients" element={<PatientsPage />} />

            {/* Payments */}
            <Route path="payments" element={<PaymentsPage />} />
          </Route>

          {/* =========================
              SUPER ADMIN ONLY
          ========================= */}
          <Route element={<ProtectedRoute superadminOnly />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </PatientAuthProvider>
  );
}

export default App;
