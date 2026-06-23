import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  LogOut,
  Menu,
} from "lucide-react";

import AuthService from "../services/authService";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const handleLogout = () => {
    AuthService.logout();

    navigate("/login", {
      replace: true,
    });
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin-dashboard",
    },
    {
      name: "Manage Exhibitors",
      icon: Users,
      path: "/manage-exhibitors",
    },
    {
      name: "Manage Tickets",
      icon: BadgeCheck,
      path: "/tickets",
    },
  ];

  return (
    <aside
      className={`bg-slate-900 text-white transition-all duration-300 min-h-screen relative ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">

        {sidebarOpen && (
          <h1 className="text-xl font-bold">
            Admin Panel
          </h1>
        )}

        <button
          onClick={() =>
            setSidebarOpen(!sidebarOpen)
          }
          className="p-2 rounded hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

      </div>

      <nav className="mt-6">
        <ul className="space-y-2 px-3">

          {menuItems.map((item) => {

            const Icon = item.icon;

            const isActive =
              location.pathname === item.path;

            return (
              <li key={item.path}>

                <button
                  onClick={() =>
                    navigate(item.path)
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? "bg-blue-600"
                      : "hover:bg-slate-800"
                  }`}
                >
                  <Icon size={20} />

                  {sidebarOpen && (
                    <span>{item.name}</span>
                  )}
                </button>

              </li>
            );
          })}

        </ul>
      </nav>

      <div className="absolute bottom-4 left-0 w-full px-3">

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600 transition"
        >
          <LogOut size={20} />

          {sidebarOpen && (
            <span>Logout</span>
          )}
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;