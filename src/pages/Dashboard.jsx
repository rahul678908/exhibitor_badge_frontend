import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import CreateBadgeModal from "../components/CreateBadgeModal";
import BulkUploadModal from "../components/BulkUploadModal";
import SendInvitationModal from "../components/SendInvitationModal";
import BatchDeleteModal from "../components/BatchDeleteModal";                    // ← NEW
import BulkUploadSuccessConfirmation from "../components/BulkUploadSuccessConfirmation"; // ← NEW
import ExhibitorAuthService from "../services/exhibitorAuthService";
import badgeService from "../services/badgeService";
import DashboardService from "../services/dashboardService";
import ExhibitorBadgeQuota from "../components/ExhibitorBadgeQuota";
import api from "../utils/axios";
import { downloadBadgePDF } from "../utils/badgePDF";
import * as XLSX from "xlsx";
import {
  FaSearch, FaSignOutAlt, FaIdBadge, FaUserPlus,
  FaUpload, FaEnvelope, FaEdit, FaTrash, FaCopy,
  FaTimes, FaDownload, FaFileExcel, FaCheckSquare,
} from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Modal states ───────────────────────────────────────────────
  const [showModal, setShowModal]                 = useState(false);
  const [showBulkModal, setShowBulkModal]         = useState(false);
  const [showInviteModal, setShowInviteModal]     = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false); // ← NEW
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);        // ← NEW
  const [uploadSuccessData, setUploadSuccessData] = useState(null);         // ← NEW

  // ── Data states ────────────────────────────────────────────────
  const [registrations, setRegistrations]         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [dashboardData, setDashboardData]         = useState(null);
  const [dashboardLoading, setDashboardLoading]   = useState(true);
  const [tickets, setTickets]                     = useState([]);

  // ── Filter / sort / pagination ─────────────────────────────────
  const [keyword, setKeyword]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ticketFilter, setTicketFilter] = useState("");
  const [batchFilter, setBatchFilter]   = useState("");
  const [sortKey, setSortKey]           = useState("created_at");
  const [sortDir, setSortDir]           = useState("desc");
  const [pageSize, setPageSize]         = useState(10);
  const [currentPage, setCurrentPage]   = useState(1);

  // ── Selection ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]   = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── Edit ───────────────────────────────────────────────────────
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [showEditModal, setShowEditModal]             = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => { fetchRegistrations(); }, []);
  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { loadTickets(); }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const data = await badgeService.getRegistrations();
      setRegistrations(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const data = await DashboardService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadTickets = async () => {
    try {
        const res = await api.get("exhibitor/my-allocations/");
        // my-allocations returns BadgeAllocation rows; map to the shape tickets filters expect
        setTickets(
          res.data
            .filter((a) => a.available_count > 0)
            .map((a) => ({ id: a.ticket_type, ticket_name: a.ticket_name, status: "active" }))
        );
        } catch {}
      };
      
  // ── Edit ──────────────────────────────────────────────────────
  const handleEdit = (item) => {
    setEditingRegistration(item);
    setShowEditModal(true);
  };

  // ── Derive unique batch names from loaded registrations ───────
  const batchOptions = useMemo(() => {
    const names = registrations.map((r) => r.batch_name).filter(Boolean);
    return [...new Set(names)];
  }, [registrations]);

  // ── Filter + sort + paginate ──────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = [...registrations];

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(kw) ||
          r.email?.toLowerCase().includes(kw) ||
          r.company_name?.toLowerCase().includes(kw) ||
          r.urn?.toLowerCase().includes(kw)
      );
    }

    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);

    if (ticketFilter) {
      const t = tickets.find((t) => String(t.id) === String(ticketFilter));
      if (t) rows = rows.filter((r) => r.ticket_name === t.ticket_name);
    }

    if (batchFilter) rows = rows.filter((r) => r.batch_name === batchFilter);

    rows.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (typeof aVal === "string") { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [registrations, keyword, statusFilter, ticketFilter, batchFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [keyword, statusFilter, ticketFilter, batchFilter, pageSize]);

  // ── Sort ──────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Selection ─────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    const pageIds = paginatedRows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !pageIds.includes(id))
        : [...new Set([...selectedIds, ...pageIds])]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const pageIds     = paginatedRows.map((r) => r.id);
  const allPageSel  = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSel = pageIds.some((id) => selectedIds.includes(id)) && !allPageSel;

  // ── Single delete ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Registration",
      text: "Are you sure you want to delete this registration?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await badgeService.deleteBadge(id);
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error?.response?.data?.message || "Unable to delete registration.",
      });
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = [...selectedIds];

    const { isConfirmed } = await Swal.fire({
      title: "Delete Selected Registrations",
      html: `
        <div style="text-align:center">
          <div style="font-size:48px;margin-bottom:8px">🗑️</div>
          <p style="color:#374151;font-size:15px">
            You are about to permanently delete
            <strong style="color:#ef4444"> ${ids.length} registration${ids.length !== 1 ? "s" : ""}</strong>.
          </p>
          <p style="color:#9ca3af;font-size:13px;margin-top:8px">This action cannot be undone.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Delete ${ids.length} record${ids.length !== 1 ? "s" : ""}`,
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;

    setBulkDeleting(true);
    Swal.fire({
      title: "Deleting...",
      text: `Removing ${ids.length} registrations`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await api.delete("exhibitor/registrations/bulk-delete/", { data: { ids } });
      const { deleted_count, requested_count } = res.data;
      const skipped = requested_count - deleted_count;

      setRegistrations((prev) => prev.filter((r) => !ids.includes(r.id)));
      clearSelection();

      await Swal.fire({
        icon: "success",
        title: "Deleted Successfully",
        html: skipped > 0
          ? `<p><strong>${deleted_count}</strong> registration${deleted_count !== 1 ? "s" : ""} deleted.</p>
             <p style="color:#d97706;margin-top:4px;font-size:13px">${skipped} skipped (already deleted or not found).</p>`
          : `<p><strong>${deleted_count}</strong> registration${deleted_count !== 1 ? "s" : ""} deleted successfully.</p>`,
        timer: 2500,
        showConfirmButton: false,
      });

      loadDashboard();
    } catch (err) {
      Swal.fire(
        "Delete Failed",
        err?.response?.data?.error || "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────
  const exportToExcel = () => {
    const rows = filteredRows.map((r) => ({
      URN: r.urn,
      Name: r.full_name,
      Email: r.email,
      "Job Title": r.job_title,
      "Ticket Type": r.ticket_name,
      Company: r.company_name,
      Batch: r.batch_name || "",
      "Registered Via": r.registered_via,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, "registrations.xlsx");
  };

  // ── Logout ────────────────────────────────────────────────────
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout",
      text: "Are you sure you want to sign out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
    });
    if (!result.isConfirmed) return;
    try {
      await ExhibitorAuthService.logout();
      Swal.fire({ icon: "success", title: "Logged Out", timer: 1500, showConfirmButton: false });
      navigate("/exhibitor-login", { replace: true });
    } catch {
      Swal.fire({ icon: "error", title: "Logout Failed", text: "Something went wrong." });
    }
  };

  return (
      <div className="flex min-h-screen bg-gray-100 overflow-x-hidden">

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

      {/* ── Sidebar ── */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#180021] text-white min-h-screen transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 lg:block`}>
          {/* Close button — visible only on mobile */}
          <button className="lg:hidden absolute top-4 right-4 text-white text-xl" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
          <div className="p-5 border-b border-purple-900">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">Time Remaining</h3>
          <div className="flex justify-between mt-4">
            {[["16","Days"],["17","Hours"],["34","Mins"],["8","Secs"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <h2 className="text-2xl font-bold text-orange-400">{val}</h2>
                <p className="text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <nav className="mt-4">
          <div className="flex items-center gap-3 px-6 py-4 bg-purple-950">
            <FaIdBadge /> Exhibitor Badges
          </div>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-x-hidden">

        {/* Navbar */}
          <header className="bg-purple-800 min-h-16 px-4 lg:px-8 flex flex-wrap items-center justify-between gap-3 py-3 text-white">
            <div className="flex gap-2 items-center">
            <button
              className="lg:hidden text-white mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            {/* <div className="relative">
              <FaSearch className="absolute top-3.5 left-3 text-gray-300" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 w-64 h-10 bg-purple-700 rounded border border-purple-500 outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div> */}
            <div className="w-60 h-10 bg-purple-700 rounded border border-purple-500 flex items-center px-4">
              GULFOOD 2026
            </div>
          </div>
        <div className="flex items-center gap-3">
          <span className="font-medium hidden sm:block truncate max-w-[140px]">
            Welcome, {user?.username || user?.name || "User"}
          </span>
            <button
              onClick={handleLogout}
              className="border border-purple-400 px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700 transition"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </header>

        <div className="p-6">

          {/* Stats Banner */}

<div
  className="rounded-2xl p-6 text-white bg-cover bg-center bg-no-repeat relative overflow-hidden"
  style={{ backgroundImage: "url('/images/banner.jpg')" }}
>
  {/* ── Top row ── */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

    <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
      <div className="bg-white w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-pink-600 text-2xl shrink-0">
        🎫
      </div>

      <div>
        <h2 className="text-3xl sm:text-4xl font-bold">
          {dashboardLoading ? "..." : dashboardData?.confirmed}
          <span className="text-base sm:text-lg">
            /{dashboardLoading ? "..." : dashboardData?.allocated_badges}
          </span>
        </h2>
        <p className="text-sm mt-1">Allocated Badges</p>
      </div>

      <div className="text-sm space-y-1">
        <p>Confirmed {dashboardData?.confirmed || 0}</p>
        <p>Pending   {dashboardData?.pending   || 0}</p>
        <p>Invited   {dashboardData?.invited   || 0}</p>
      </div>
    </div>

    {/* Available badge circle — moves below on mobile, right on desktop */}
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center text-green-600 font-bold text-lg sm:text-xl shrink-0 self-start sm:self-auto">
      {dashboardLoading ? "..." : dashboardData?.available_badges}
    </div>

  </div>

  {/* ── Ticket balance breakdown ── */}
  {!dashboardLoading && dashboardData?.ticket_breakdown?.length > 0 && (
    <div className="mt-5 border-t border-white/30 pt-4 grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3">
      {dashboardData.ticket_breakdown.map((tt) => {
        const pct = tt.allocated > 0
          ? Math.round((tt.used / tt.allocated) * 100)
          : 0;
        const low = tt.available <= 5;

        return (
          <div key={tt.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 lg:min-w-[160px] lg:flex-1">

            {/* ticket name */}
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70 truncate">
              {tt.ticket_name}
            </p>

            {/* big available number */}
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${low ? "text-red-300" : "text-green-300"}`}>
              {tt.available}
              <span className="text-sm font-normal text-white/60"> / {tt.allocated}</span>
            </p>

            {/* progress bar */}
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: low ? "#f87171" : "#4ade80",
                }}
              />
            </div>

            <p className="text-xs text-white/50 mt-1">{tt.used} used</p>
          </div>
        );
      })}
    </div>
  )}
</div>

          {/* ── Badge Quota ── */}
          <div className="bg-white rounded-2xl shadow mt-6 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Your Badge Quota</h3>
            <ExhibitorBadgeQuota refreshKey={registrations.length} />
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-2xl shadow p-8">
              <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center text-2xl text-pink-500"><FaUserPlus /></div>
              <h3 className="font-semibold text-16px mt-6">Create Single Badge</h3>
              <p className="text-gray-500 mt-3">Register an employee from your company instantly.</p>
              <button onClick={() => setShowModal(true)} className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-lg">
                Create Badge
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow p-8">
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 text-2xl"><FaUpload /></div>
              <h3 className="font-semibold text-16px mt-6">Bulk Upload</h3>
              <p className="text-gray-500 mt-3">Upload multiple registrations at once.</p>
              <button onClick={() => setShowBulkModal(true)} className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-lg">
                Upload File
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow p-8">
              <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500 text-2xl"><FaEnvelope /></div>
              <h3 className="font-semibold text-16px mt-6">Send Invitations</h3>
              <p className="text-gray-500 mt-3">Send invitations using email.</p>
              <button onClick={() => setShowInviteModal(true)} className="mt-5 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg">
                Send Invitation
              </button>
            </div>
          </div>

          {/* ── Registrations Table ── */}
          <div className="bg-white rounded-2xl shadow mt-8 p-6">

            {/* Table Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold">Registrations</h2>
                {selectedIds.length > 0 && (
                  <p className="text-sm text-purple-600 font-medium mt-0.5">
                    {selectedIds.length} row{selectedIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* ── Delete by batch button ── */}
                <button
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium border border-red-200 text-red-600 hover:bg-red-50 transition text-sm"
                >
                  <FaTrash size={13} />
                  Delete by Batch
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
                    selectedIds.length > 0
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {bulkDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaTrash size={13} />
                  )}
                  {bulkDeleting
                    ? "Deleting..."
                    : selectedIds.length > 0
                    ? `Delete (${selectedIds.length})`
                    : "Bulk Delete"}
                </button>

                <button
                  onClick={exportToExcel}
                  className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium"
                >
                  <FaFileExcel /> Export to Excel
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Keyword</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search..."
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="invited">Invited</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tickets</label>
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">All Tickets</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>{t.ticket_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Batch</label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">All Batches</option>
                  {batchOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Show entries + Bulk Action Bar */}
            <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                      {selectedIds.length}
                    </div>
                    <span className="text-sm font-semibold text-red-700">
                      {selectedIds.length} selected
                    </span>
                  </div>
                  <div className="w-px h-5 bg-red-200" />
                  <button
                    onClick={clearSelection}
                    className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition"
                  >
                    <FaTimes size={10} /> Clear
                  </button>
                  <div className="w-px h-5 bg-red-200" />
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    {bulkDeleting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FaTrash size={11} />
                    )}
                    {bulkDeleting
                      ? "Deleting..."
                      : `Delete ${selectedIds.length} registration${selectedIds.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="p-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allPageSel}
                        ref={(el) => { if (el) el.indeterminate = somePageSel; }}
                        onChange={toggleSelectAll}
                        className="accent-purple-700 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    {[
                      { label: "Name",         key: "full_name"      },
                      { label: "Job Title",    key: "job_title"      },
                      { label: "Batch",        key: "batch_name"     },
                      { label: "Ticket Class", key: "ticket_name"    },
                      { label: "Company Name", key: "company_name"   },
                      { label: "Status",       key: "status"         },
                      { label: "Action",       key: null             },
                    ].map(({ label, key }) => (
                      <th
                        key={label}
                        onClick={() => key && handleSort(key)}
                        className={`p-3 text-left font-semibold text-gray-600 whitespace-nowrap ${key ? "cursor-pointer hover:text-purple-700 select-none" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {key && (
                            <span className="text-gray-300 text-xs">
                              {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center p-10 text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center p-10 text-gray-400">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`border-b transition ${isSelected ? "bg-purple-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="accent-purple-700 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-purple-700 hover:underline cursor-pointer">
                              {item.full_name}
                            </p>
                            <p className="text-xs text-gray-400">{item.email}</p>
                          </td>
                          <td className="p-3 text-gray-600">{item.job_title || "—"}</td>
                          <td className="p-3">
                            {item.batch_name ? (
                              <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs font-medium">
                                {item.batch_name}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600">{item.ticket_name || "—"}</td>
                          <td className="p-3 text-gray-600">{item.company_name || "—"}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              item.status === "confirmed" ? "bg-green-100 text-green-700"
                              : item.status === "invited"  ? "bg-blue-100 text-blue-700"
                              : item.status === "pending"  ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.status === "confirmed" ? "bg-green-500"
                                : item.status === "invited"  ? "bg-blue-500"
                                : item.status === "pending"  ? "bg-yellow-500"
                                : "bg-red-500"
                              }`} />
                              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                            </span>
                            {item.created_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(item.created_at).toLocaleString("en-GB", {
                                  day: "2-digit", month: "2-digit", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-1.5 rounded transition"
                                  title="Edit"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="bg-red-100 hover:bg-red-200 text-red-500 p-1.5 rounded transition"
                                  title="Delete"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                              <div className="flex gap-1">
                                {item.invitation_link && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.invitation_link);
                                      Swal.fire({ icon: "success", title: "Copied", timer: 1000, showConfirmButton: false });
                                    }}
                                    className="bg-green-100 hover:bg-green-200 text-green-600 p-1.5 rounded transition"
                                    title="Copy Invitation Link"
                                  >
                                    <FaEnvelope size={12} />
                                  </button>
                                )}
                                {item.status === "confirmed" && (
                                  <button
                                    onClick={() => downloadBadgePDF(item)}
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-600 p-1.5 rounded transition"
                                    title="Download Badge"
                                  >
                                    <FaDownload size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredRows.length > 0 && (
              <div className="flex items-center justify-between mt-5 text-sm text-gray-500 flex-wrap gap-3">
                <p>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
                  {filteredRows.length} entries
                  {selectedIds.length > 0 && (
                    <span className="ml-3 text-purple-600 font-semibold">
                      · {selectedIds.length} selected
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`e-${i}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded font-medium transition ${
                            currentPage === p
                              ? "bg-red-500 text-white"
                              : "border text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      {showModal && (
        <CreateBadgeModal onClose={() => setShowModal(false)} onSuccess={fetchRegistrations} />
      )}

      {/* ── MODIFIED: onSuccess now receives batch data to trigger confirmation ── */}
      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={(data) => {
            fetchRegistrations();
            loadDashboard();
            setShowBulkModal(false);
            // BulkUploadModal should call onSuccess({ batchName, committedCount })
            // when commit completes. If it just calls onSuccess() with no args,
            // the success modal won't show — update BulkUploadModal to pass those.
            if (data?.batchName && data?.committedCount != null) {
              setUploadSuccessData(data);
              setShowUploadSuccess(true);
            }
          }}
        />
      )}

      {showInviteModal && (
        <SendInvitationModal onClose={() => setShowInviteModal(false)} onSuccess={fetchRegistrations} />
      )}

      {showEditModal && (
        <CreateBadgeModal
          editData={editingRegistration}
          onClose={() => { setShowEditModal(false); setEditingRegistration(null); }}
          onSuccess={() => { fetchRegistrations(); setShowEditModal(false); }}
        />
      )}

      {/* ── NEW: Batch delete modal ── */}
      {showBatchDeleteModal && (
        <BatchDeleteModal
          onClose={() => setShowBatchDeleteModal(false)}
          onDeleted={() => {
            setShowBatchDeleteModal(false);
            fetchRegistrations();
            loadDashboard();
          }}
        />
      )}

      {/* ── NEW: Upload success confirmation ── */}
      {showUploadSuccess && uploadSuccessData && (
        <BulkUploadSuccessConfirmation
          batchName={uploadSuccessData.batchName}
          committedCount={uploadSuccessData.committedCount}
          onDone={() => {
            setShowUploadSuccess(false);
            setUploadSuccessData(null);
          }}
          onViewRecords={() => {
            setShowUploadSuccess(false);
            setUploadSuccessData(null);
            // Scroll the registrations table into view
            document.querySelector("table")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

    </div>
  );
}