import { Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { AdminLayout } from "./components/admin/AdminLayout";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { WizardLayout } from "./components/wizard/WizardLayout";
import { BookingWizardPage } from "./pages/patient/BookingWizardPage";
import { SuccessPage } from "./pages/patient/SuccessPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { AppointmentsPage } from "./pages/admin/AppointmentsPage";
import { PatientsPage } from "./pages/admin/PatientsPage";
import { PaymentsPage } from "./pages/admin/PaymentsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";

function App() {
  return (
    <Routes>
      <Route element={<WizardLayout />}>
        <Route path="/" element={<BookingWizardPage />} />
        <Route path="/success" element={<SuccessPage />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <AdminAuthProvider>
            <AdminLayout />
          </AdminAuthProvider>
        }
      >
        <Route path="login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route index element={<DashboardPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>

        <Route element={<ProtectedRoute superadminOnly />}>
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
