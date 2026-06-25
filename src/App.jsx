import { BrowserRouter, Routes, Route } from "react-router-dom";

import 'flag-icons/css/flag-icons.min.css';
import AdminLogin from "./pages/AdminLogin";
import ExhibitorDashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ExhibitorManagement from "./pages/ExhibitorManagement";
import TicketManagement from "./pages/TicketManagement";
import ExhibitorLogin from "./pages/ExhibitorLogin";
import LoginSelector from "./pages/LoginSelector";
import RegisterPage from "./pages/RegisterPage";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginSelector />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/exhibitor-login" element={<ExhibitorLogin />} />
        <Route path="register/:token" element={<RegisterPage />} />

        {/* ✅ Exhibitor protected routes */}
        <Route element={<ProtectedRoute tokenKey="exhibitor_access_token" redirectTo="/exhibitor-login" />}>
          <Route path="/exhibitor-dashboard" element={<ExhibitorDashboard />} />
        </Route>

        {/* ✅ Admin protected routes — now wrapped in AdminLayout (sidebar + white card) */}
        <Route element={<ProtectedRoute tokenKey="access_token" redirectTo="/login" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/manage-exhibitors" element={<ExhibitorManagement />} />
            <Route path="/tickets" element={<TicketManagement />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;