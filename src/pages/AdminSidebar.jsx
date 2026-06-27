// pages/AdminSidebar.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, BadgeCheck, LogOut, Menu, X } from "lucide-react";
import AuthService from "../services/authService";

const menuItems = [
  { name: "Dashboard",         icon: LayoutDashboard, path: "/admin-dashboard"   },
  { name: "Manage Exhibitors", icon: Users,           path: "/manage-exhibitors" },
  { name: "Manage Tickets",    icon: BadgeCheck,      path: "/tickets"           },
];

const NavList = ({ sidebarOpen, onNavigate, onLogout, location }) => (
  <div className="flex flex-col flex-1">
    <nav className="mt-6 flex-1">
      <ul className="space-y-2 px-3">
        {menuItems.map((item) => {
          const Icon     = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <button
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? "bg-blue-600" : "hover:bg-slate-800"
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>

    <div className="p-3">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600 transition"
      >
        <LogOut size={20} />
        {sidebarOpen && <span>Logout</span>}
      </button>
    </div>
  </div>
);

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    AuthService.logout();
    navigate("/login", { replace: true });
  };

  const handleNavigate = (path) => {
    navigate(path);
    onMobileClose?.();
  };

  return (
    <>
      {/* ── DESKTOP sidebar — normal flex flow, never fixed ── */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 text-white min-h-screen transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {sidebarOpen && <h1 className="text-xl font-bold">Admin Panel</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
        </div>

        <NavList
          sidebarOpen={sidebarOpen}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          location={location}
        />
      </aside>

      {/* ── MOBILE drawer — fixed, slides in from left ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white w-64 transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <button
            onClick={onMobileClose}
            className="p-2 rounded hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Always show full labels in the mobile drawer */}
        <NavList
          sidebarOpen={true}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          location={location}
        />
      </aside>
    </>
  );
};

export default Sidebar;