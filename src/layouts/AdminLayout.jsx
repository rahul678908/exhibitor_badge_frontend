// layouts/AdminLayout.jsx
import { useState } from "react";
import Sidebar from "../pages/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  // ── Mobile sidebar state lives here so the hamburger
  //    inside the topbar (main area) can also close it ──
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex bg-gray-100 min-h-screen">

      {/* ── Mobile overlay — tapping it closes the sidebar ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 p-4 lg:p-6 min-w-0">

        {/* ── Mobile topbar with hamburger ── */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm"
            aria-label="Open menu"
          >
            {/* hamburger icon — no extra import needed */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-700 text-sm">Admin Panel</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 min-h-[95vh]">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default AdminLayout;