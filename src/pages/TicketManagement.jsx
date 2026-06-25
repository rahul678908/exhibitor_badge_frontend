import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Plus, Search, Ticket, Pencil, Trash2, RefreshCw } from "lucide-react";
import TicketService from "../services/allocateBadges";

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
      {status}
    </span>
  );
};

// ─── Quota Bar ────────────────────────────────────────────────────────────────
const QuotaBar = ({ allocated, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0;
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 shrink-0">{pct}%</span>
    </div>
  );
};

// ─── Validation helpers ─────────────────────────────────────────────────
const TICKET_CODE_REGEX = /^[A-Za-z0-9_-]+$/;

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const validateTicketForm = ({ ticket_name, ticket_code, total_tickets_raw }) => {
  if (!ticket_name.trim()) return "Ticket name is required.";
  if (!ticket_code.trim()) return "Ticket code is required.";
  if (!TICKET_CODE_REGEX.test(ticket_code.trim()))
    return "Ticket code can only contain letters, numbers, hyphens, and underscores.";
  if (!total_tickets_raw.trim()) return "Total tickets is required.";
  if (!/^\d+$/.test(total_tickets_raw.trim()))
    return "Total tickets must be a whole positive number.";
  if (parseInt(total_tickets_raw, 10) < 1)
    return "Total tickets must be at least 1.";
  return null;
};

const getServiceErrorMessage = (error, fallback) => {
  if (typeof error === "string") return error;
  return (
    error?.error ||
    error?.detail ||
    error?.message ||
    error?.ticket_code?.[0] ||
    error?.ticket_name?.[0] ||
    fallback
  );
};

const TicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await TicketService.getTickets();
      setTickets(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Failed to load tickets"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const createTicket = async () => {
    const { value } = await Swal.fire({
      title: "Create Ticket Type",
      html: `
        <input id="ticket_name" class="swal2-input" placeholder="Ticket Name">
        <input id="ticket_code" class="swal2-input" placeholder="Ticket Code (e.g. VIP, GENERAL)">
        <input id="total_tickets" type="number" min="1" class="swal2-input" placeholder="Total Tickets (global pool)">
        <textarea id="description" class="swal2-textarea" placeholder="Description (optional)"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      preConfirm: () => {
        const ticket_name = document.getElementById("ticket_name").value;
        const ticket_code = document.getElementById("ticket_code").value;
        const total_tickets_raw = document.getElementById("total_tickets").value;
        const description = document.getElementById("description").value;

        const error = validateTicketForm({ ticket_name, ticket_code, total_tickets_raw });
        if (error) {
          Swal.showValidationMessage(error);
          return false;
        }

        return {
          ticket_name: ticket_name.trim(),
          ticket_code: ticket_code.trim(),
          total_tickets: parseInt(total_tickets_raw, 10),
          description: description.trim(),
        };
      },
    });

    if (!value) return;

    try {
      await TicketService.createTicket(value);
      Swal.fire("Success", "Ticket type created successfully.", "success");
      loadTickets();
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Failed to create ticket"), "error");
    }
  };

  const editTicket = async (ticket) => {
    // ── Derived counts for the warning banner ──────────────────────────
    const totalAllocated = ticket.total_allocated ?? 0;   // sum of all exhibitor allocations
    const totalUsed      = ticket.total_used      ?? 0;   // confirmed registrations
    const existingDescription = ticket.description ?? ticket.ticket_description ?? "";

    const warningHtml =
      totalAllocated > 0
        ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin:8px 0 4px;text-align:left;font-size:13px;">
            <p style="margin:0 0 4px;font-weight:600;color:#92400e;">⚠️ Allocation in use</p>
            <p style="margin:0;color:#78350f;">
              <b>${totalAllocated}</b> badge${totalAllocated !== 1 ? "s" : ""} have been allocated to exhibitors
              (${totalUsed} already used). You can only <b>increase</b> the total, not reduce it below <b>${totalAllocated}</b>.
            </p>
          </div>`
        : `<p style="font-size:12px;color:#6b7280;margin:4px 0 0;text-align:left;">
            No exhibitor allocations yet — you can set any total.
          </p>`;

    const { value } = await Swal.fire({
      title: "Edit Ticket Type",
      html: `
        <input id="ticket_name" class="swal2-input" placeholder="Ticket Name" value="${escapeHtml(ticket.ticket_name)}">
        <input id="ticket_code" class="swal2-input" placeholder="Ticket Code" value="${escapeHtml(ticket.ticket_code)}">
        <input
          id="total_tickets"
          type="number"
          min="${totalAllocated > 0 ? totalAllocated : 1}"
          class="swal2-input"
          placeholder="Total Tickets"
          value="${ticket.total_tickets ?? 0}"
        >
        ${warningHtml}
        <select id="status" class="swal2-select" style="display:block;width:100%;margin:0.5em auto;padding:0.5em;border-radius:0.25em;border:1px solid #d9d9d9;">
          <option value="active"   ${ticket.status === "active"   ? "selected" : ""}>Active</option>
          <option value="inactive" ${ticket.status !== "active"   ? "selected" : ""}>Inactive</option>
        </select>
        <textarea id="description" class="swal2-textarea" placeholder="Description (optional)">${escapeHtml(existingDescription)}</textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save Changes",
      preConfirm: () => {
        const ticket_name       = document.getElementById("ticket_name").value;
        const ticket_code       = document.getElementById("ticket_code").value;
        const total_tickets_raw = document.getElementById("total_tickets").value;
        const description       = document.getElementById("description").value;
        const status_val        = document.getElementById("status").value;

        const error = validateTicketForm({ ticket_name, ticket_code, total_tickets_raw });
        if (error) {
          Swal.showValidationMessage(error);
          return false;
        }

        const newTotal = parseInt(total_tickets_raw, 10);

        // Client-side guard: can't go below what's already allocated
        if (totalAllocated > 0 && newTotal < totalAllocated) {
          Swal.showValidationMessage(
            `Cannot reduce total below ${totalAllocated} — that many badges are already allocated to exhibitors.`
          );
          return false;
        }

        return {
          ticket_name:   ticket_name.trim(),
          ticket_code:   ticket_code.trim(),
          total_tickets: newTotal,
          description:   description.trim(),
          status:        status_val,
        };
      },
    });

    if (!value) return;

    try {
      await TicketService.updateTicket(ticket.id, value);
      Swal.fire("Updated", "Ticket type updated successfully.", "success");
      loadTickets();
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Update failed"), "error");
    }
  };

  const deleteTicket = async (id) => {
    const result = await Swal.fire({
      title: "Delete Ticket Type?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await TicketService.deleteTicket(id);
      Swal.fire("Deleted", "Ticket type deleted.", "success");
      loadTickets();
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Delete failed"), "error");
    }
  };

  const filtered = tickets.filter((ticket) =>
    (ticket.ticket_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const totalPool      = tickets.reduce((s, t) => s + (t.total_tickets    ?? 0), 0);
  const totalAllocated = tickets.reduce((s, t) => s + (t.total_allocated  ?? 0), 0);
  const totalUsed      = tickets.reduce((s, t) => s + (t.total_used       ?? 0), 0);
  const totalFree      = tickets.reduce((s, t) => s + (t.unallocated_count ?? (t.total_tickets - (t.total_allocated ?? 0))), 0);

  const stats = [
    { label: "Ticket Types",       value: tickets.length,                                       color: "text-slate-700"  },
    { label: "Active Types",        value: tickets.filter((t) => t.status === "active").length,  color: "text-emerald-600"},
    { label: "Total Pool",          value: totalPool.toLocaleString(),                           color: "text-blue-600"   },
    { label: "Allocated to Exhibitors", value: totalAllocated.toLocaleString(),                 color: "text-amber-600"  },
    { label: "Used (Confirmed)",    value: totalUsed.toLocaleString(),                           color: "text-purple-600" },
    { label: "Unallocated",         value: totalFree.toLocaleString(),                          color: "text-slate-500"  },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Ticket size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Ticket Management</h2>
            <p className="text-sm text-slate-500">Manage badge ticket types and global quotas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={createTicket}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} />
            Create Ticket
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 leading-tight">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading tickets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Ticket size={36} className="text-slate-300" />
            <p className="text-sm">No tickets yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  "Name",
                  "Code",
                  "Total Pool",
                  "Allocated to Exhibitors",
                  "Used (Confirmed)",
                  "Available (Unallocated)",
                  "Allocation %",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filtered.map((ticket) => {
                // Support both naming conventions the backend might return
                const totalPool_    = ticket.total_tickets       ?? 0;
                const totalAlloc    = ticket.total_allocated      ?? 0;   // sum BadgeAllocation.allocated_count
                const totalUsed_    = ticket.total_used           ?? 0;   // confirmed registrations
                const unallocated   = ticket.unallocated_count    ?? (totalPool_ - totalAlloc);
                const isOverAllocated = totalAlloc > totalPool_;

                return (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-800">{ticket.ticket_name}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{ticket.ticket_code}</td>

                    {/* Total Pool */}
                    <td className="px-4 py-3.5 font-semibold text-blue-600">
                      {totalPool_.toLocaleString()}
                    </td>

                    {/* Allocated to exhibitors */}
                    <td className="px-4 py-3.5">
                      <span className={`font-semibold ${isOverAllocated ? "text-red-600" : "text-amber-600"}`}>
                        {totalAlloc.toLocaleString()}
                      </span>
                      {isOverAllocated && (
                        <span className="ml-1 text-xs text-red-500">(over!)</span>
                      )}
                    </td>

                    {/* Used (confirmed) */}
                    <td className="px-4 py-3.5 font-semibold text-purple-600">
                      {totalUsed_.toLocaleString()}
                    </td>

                    {/* Unallocated (free to assign to more exhibitors) */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`font-semibold ${
                          unallocated <= 0
                            ? "text-red-500"
                            : unallocated <= 10
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {Math.max(0, unallocated).toLocaleString()}
                      </span>
                    </td>

                    {/* Allocation bar */}
                    <td className="px-4 py-3.5">
                      <QuotaBar allocated={totalAlloc} total={totalPool_} />
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge status={ticket.status} />
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => editTicket(ticket)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTicket(ticket.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TicketManagement;