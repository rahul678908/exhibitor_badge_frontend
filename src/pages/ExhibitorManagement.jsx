import React, { useEffect, useState, useCallback } from "react";
import exhibitorService from "../services/exhibitorService";
import Swal from "sweetalert2";
import { Eye, Plus, RefreshCw, Users, Trash2, Shield, X, Save, ChevronDown, ChevronUp } from "lucide-react";
import api from "../utils/axios";

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
const QuotaBar = ({ used, allocated }) => {
  const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 shrink-0">{pct}%</span>
    </div>
  );
};

// ─── Badge Allocation Panel ───────────────────────────────────────────────────
const BadgeAllocationPanel = ({ exhibitor, onClose, onSaved }) => {
  const [allocations, setAllocations] = useState([]);   // current allocations from GET
  const [ticketTypes, setTicketTypes] = useState([]);   // all active ticket types
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(null); // ticket_type_id being saved

  // form state: { [ticket_type_id]: { value: "", error: "" } }
  const [inputs, setInputs] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allocRes, ticketRes] = await Promise.all([
        api.get(`admin/exhibitors/${exhibitor.id}/badge-allocations/`),
        api.get("admin/tickets/"),
      ]);

      const allocs   = Array.isArray(allocRes.data)
        ? allocRes.data
        : allocRes.data?.results ?? [];

      const tickets  = (Array.isArray(ticketRes.data)
        ? ticketRes.data
        : ticketRes.data?.results ?? []
      ).filter((t) => t.status === "active");

      setAllocations(allocs);
      setTicketTypes(tickets);

      // Pre-fill inputs from existing allocations
      const initInputs = {};
      tickets.forEach((t) => {
        const existing = allocs.find((a) => a.ticket_type === t.id || a.ticket_type_id === t.id);
        initInputs[t.id] = {
          value: existing ? String(existing.allocated_count) : "",
          remarks: existing?.remarks ?? "",
          error: "",
        };
      });
      setInputs(initInputs);
    } catch {
      Swal.fire("Error", "Failed to load allocations.", "error");
    } finally {
      setLoading(false);
    }
  }, [exhibitor.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (ticketType) => {
    const tid   = ticketType.id;
    const raw   = (inputs[tid]?.value ?? "").trim();
    const remarks = inputs[tid]?.remarks ?? "";

    // Validation
    if (!raw) {
      setInputs((p) => ({ ...p, [tid]: { ...p[tid], error: "Enter a number." } }));
      return;
    }
    if (!/^\d+$/.test(raw) || parseInt(raw, 10) < 1) {
      setInputs((p) => ({ ...p, [tid]: { ...p[tid], error: "Must be a positive number." } }));
      return;
    }

    const count = parseInt(raw, 10);

    // Client-side guard: can't exceed the unallocated pool for this ticket type
    const unallocatedForOthers =
      (ticketType.total_tickets ?? 0) - (ticketType.total_allocated ?? 0);

    const existingAlloc = allocations.find(
      (a) => a.ticket_type === tid || a.ticket_type_id === tid
    );
    const currentlyHeld = existingAlloc?.allocated_count ?? 0;

    // What this exhibitor can take = what's unallocated + what they already hold
    const maxAllowable = unallocatedForOthers + currentlyHeld;

    if (count > maxAllowable) {
      setInputs((p) => ({
        ...p,
        [tid]: {
          ...p[tid],
          error: `Only ${maxAllowable} badge${maxAllowable !== 1 ? "s" : ""} available (${unallocatedForOthers} unallocated + ${currentlyHeld} already held by this exhibitor).`,
        },
      }));
      return;
    }

    setSaving(tid);
    try {
      await api.post("admin/badge-allocations/", {
        exhibitor_id:    exhibitor.id,
        ticket_type_id:  tid,
        allocated_count: count,
        remarks,
      });

      setInputs((p) => ({ ...p, [tid]: { ...p[tid], error: "" } }));
      await load();    // refresh allocations + recompute inputs
      onSaved?.();     // refresh parent table

      Swal.fire({
        icon: "success",
        title: "Allocation saved",
        text: `${count} '${ticketType.ticket_name}' badge${count !== 1 ? "s" : ""} allocated to ${exhibitor.company_name}.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save allocation.";
      setInputs((p) => ({ ...p, [tid]: { ...p[tid], error: msg } }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl text-white"
          style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)" }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Badge Allocation</h2>
              <p className="text-sm text-blue-200">{exhibitor.company_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading allocations…
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No active ticket types found.</p>
              <p className="text-sm mt-1">Create ticket types in Ticket Management first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Set how many badges of each type this exhibitor can distribute. You can only increase an allocation, not reduce it below the number already used.
              </p>

              {ticketTypes.map((ticket) => {
                const alloc   = allocations.find(
                  (a) => a.ticket_type === ticket.id || a.ticket_type_id === ticket.id
                );
                const allocated   = alloc?.allocated_count ?? 0;
                const used        = alloc?.used_count       ?? alloc?.available_count != null
                  ? (allocated - (alloc?.available_count ?? 0))
                  : 0;
                const available   = alloc?.available_count ?? 0;
                const input       = inputs[ticket.id] ?? { value: "", remarks: "", error: "" };
                const isSaving    = saving === ticket.id;

                // Unallocated from global pool (what's still free to assign)
                const globalUnallocated =
                  (ticket.total_tickets ?? 0) - (ticket.total_allocated ?? 0);
                const maxNew = globalUnallocated + allocated; // can't exceed this

                return (
                  <div
                    key={ticket.id}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    {/* Ticket header */}
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{ticket.ticket_name}</span>
                        <span className="text-xs text-slate-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                          {ticket.ticket_code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Global pool: <span className="font-semibold text-blue-600">{ticket.total_tickets ?? 0}</span>
                        {" · "}Unallocated: <span className={`font-semibold ${globalUnallocated <= 0 ? "text-red-500" : "text-emerald-600"}`}>
                          {Math.max(0, globalUnallocated)}
                        </span>
                      </div>
                    </div>

                    {/* Allocation stats (only if there's an existing allocation) */}
                    {allocated > 0 && (
                      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-slate-100 bg-white">
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-600">{allocated}</p>
                          <p className="text-xs text-slate-400">Allocated</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-600">{used}</p>
                          <p className="text-xs text-slate-400">Used</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${available <= 0 ? "text-red-500" : "text-emerald-600"}`}>
                            {available}
                          </p>
                          <p className="text-xs text-slate-400">Remaining</p>
                        </div>
                      </div>
                    )}

                    {/* Quota bar */}
                    {allocated > 0 && (
                      <div className="px-4 py-2 border-b border-slate-100">
                        <QuotaBar used={used} allocated={allocated} />
                      </div>
                    )}

                    {/* Input row */}
                    <div className="px-4 py-3 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-medium block mb-1">
                            {allocated > 0 ? "Update allocation" : "Set allocation"}
                            {allocated > 0 && (
                              <span className="text-slate-400 ml-1">(current: {allocated})</span>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={allocated > 0 ? allocated : 1}
                              max={maxNew}
                              value={input.value}
                              onChange={(e) =>
                                setInputs((p) => ({
                                  ...p,
                                  [ticket.id]: { ...p[ticket.id], value: e.target.value, error: "" },
                                }))
                              }
                              placeholder={allocated > 0 ? `${allocated} (min)` : "Enter count"}
                              className={`w-32 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 ${
                                input.error ? "border-red-400" : ""
                              }`}
                            />
                            <input
                              type="text"
                              value={input.remarks}
                              onChange={(e) =>
                                setInputs((p) => ({
                                  ...p,
                                  [ticket.id]: { ...p[ticket.id], remarks: e.target.value },
                                }))
                              }
                              placeholder="Remarks (optional)"
                              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              onClick={() => handleSave(ticket)}
                              disabled={isSaving || !input.value}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
                            >
                              {isSaving ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Save size={13} />
                              )}
                              {isSaving ? "Saving…" : allocated > 0 ? "Update" : "Allocate"}
                            </button>
                          </div>

                          {input.error && (
                            <p className="text-red-500 text-xs mt-1">{input.error}</p>
                          )}

                          {allocated > 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              ↑ Can only increase — already {used} badge{used !== 1 ? "s" : ""} in use.
                            </p>
                          )}

                          {globalUnallocated <= 0 && allocated === 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              No unallocated badges remain in the global pool. Increase the total in Ticket Management first.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Validation ───────────────────────────────────────────────────────────────
const NAME_REGEX     = /^[a-zA-Z\s'\-\.]+$/;
const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX    = /^\+?\d{7,15}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const validateExhibitorForm = (
  { username, password, company_name, contact_person, contact_email, contact_phone },
  isEdit = false
) => {
  if (!username.trim())                           return "Username is required.";
  if (username.trim().length < 3)                 return "Username must be at least 3 characters.";
  if (/\s/.test(username.trim()))                 return "Username must not contain spaces.";
  if (!USERNAME_REGEX.test(username.trim()))       return "Username can only contain letters, numbers, and underscores.";

  if (!isEdit && !password)                       return "Password is required.";
  if (!isEdit && password.length < 6)             return "Password must be at least 6 characters.";
  if (!isEdit && /^\d+$/.test(password))          return "Password cannot be all numbers.";
  if (!isEdit && password === username.trim())     return "Password cannot be the same as username.";
  if (isEdit && password && password.length < 6)  return "New password must be at least 6 characters.";

  if (!company_name.trim())                       return "Company name is required.";
  if (/\d/.test(company_name))                    return "Company name must not contain numbers.";
  if (company_name.trim().length < 2)             return "Company name must be at least 2 characters.";
  if (company_name.trim().length > 150)           return "Company name must be under 150 characters.";

  if (!contact_person.trim())                     return "Contact person is required.";
  if (!NAME_REGEX.test(contact_person.trim()))     return "Contact person name must contain letters only.";
  if (contact_person.trim().length < 2)           return "Contact person must be at least 2 characters.";
  if (contact_person.trim().length > 100)         return "Contact person name is too long.";

  if (!contact_email.trim())                      return "Contact email is required.";
  if (!EMAIL_REGEX.test(contact_email.trim()))     return "Enter a valid email address.";
  if (contact_email.trim().length > 254)          return "Email address is too long.";

  if (!contact_phone.trim())                      return "Contact phone is required.";
  if (!PHONE_REGEX.test(contact_phone.trim()))     return "Enter a valid phone number (7–15 digits).";

  return null;
};

const getServiceErrorMessage = (error, fallback) => {
  if (typeof error === "string") return error;
  return (
    error?.username?.[0]         ||
    error?.password?.[0]         ||
    error?.company_name?.[0]     ||
    error?.contact_email?.[0]    ||
    error?.contact_phone?.[0]    ||
    error?.non_field_errors?.[0] ||
    error?.error                 ||
    error?.detail                ||
    error?.message               ||
    fallback
  );
};

const exhibitorFormHtml = (defaults = {}, isEdit = false) => `
  <input id="username"       class="swal2-input" placeholder="Username"       value="${defaults.username       ?? ""}">
  <input id="password"       class="swal2-input" placeholder="Password${isEdit ? " (leave blank to keep)" : ""}" type="password">
  <input id="company_name"   class="swal2-input" placeholder="Company Name"   value="${defaults.company_name   ?? ""}">
  <input id="contact_person" class="swal2-input" placeholder="Contact Person" value="${defaults.contact_person ?? ""}">
  <input id="contact_email"  class="swal2-input" placeholder="Contact Email"  value="${defaults.contact_email  ?? ""}">
  <input id="contact_phone"  class="swal2-input" placeholder="Contact Phone"  value="${defaults.contact_phone  ?? ""}">
`;

const collectFormValues = () => ({
  username:       document.getElementById("username").value,
  company_name:   document.getElementById("company_name").value,
  contact_person: document.getElementById("contact_person").value,
  contact_email:  document.getElementById("contact_email").value,
  contact_phone:  document.getElementById("contact_phone").value,
  password:       document.getElementById("password").value,
});

// ─── Main Component ───────────────────────────────────────────────────────────
const ExhibitorManagement = () => {
  const [exhibitors, setExhibitors]             = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [allocationTarget, setAllocationTarget] = useState(null); // exhibitor obj for panel

  const loadExhibitors = async () => {
    try {
      setLoading(true);
      const data = await exhibitorService.getExhibitors();
      setExhibitors(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Failed to load exhibitors"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExhibitors(); }, []);

  // ─── Create ────────────────────────────────────────────────────────────────
  const createExhibitor = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Create Exhibitor",
      width: 700,
      html: exhibitorFormHtml({}, false),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      preConfirm: () => {
        const values = collectFormValues();
        const error = validateExhibitorForm(values, false);
        if (error) { Swal.showValidationMessage(error); return false; }
        if (!values.password) delete values.password;
        return values;
      },
    });

    if (!formValues) return;

    try {
      Swal.fire({ title: "Creating...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await exhibitorService.createExhibitor(formValues);
      Swal.fire("Created!", "Exhibitor created successfully.", "success");
      loadExhibitors();
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Creation failed"), "error");
    }
  };

  // ─── View ──────────────────────────────────────────────────────────────────
  const viewExhibitor = async (id) => {
    try {
      const data = await exhibitorService.getExhibitor(id);
      Swal.fire({
        title: data.company_name,
        html: `
          <div style="text-align:left;line-height:2">
            <p><b>Contact:</b> ${data.contact_person}</p>
            <p><b>Email:</b>   ${data.contact_email}</p>
            <p><b>Phone:</b>   ${data.contact_phone}</p>
            <p><b>Status:</b>  ${data.status}</p>
            <p><b>Username:</b>${data.username}</p>
          </div>`,
        confirmButtonText: "Close",
      });
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Failed to load details"), "error");
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const deleteExhibitor = async (item) => {
    let detail = null;
    try {
      detail = await exhibitorService.getExhibitor(item.id);
    } catch {
      detail = item;
    }

    const registrations = detail?.registration_count ?? detail?.registrations  ?? 0;
    const activeBadges  = detail?.active_badge_count  ?? detail?.active_badges  ?? 0;
    const invitations   = detail?.invitation_count    ?? detail?.invitations    ?? 0;
    const hasData       = registrations > 0 || activeBadges > 0 || invitations > 0;

    const dataWarningHtml = hasData
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:12px 0;text-align:left;">
          <p style="font-weight:600;color:#dc2626;margin-bottom:8px;">⚠️ This account contains active data:</p>
          <ul style="margin:0;padding-left:18px;color:#7f1d1d;line-height:2;">
            ${registrations > 0 ? `<li><b>${registrations}</b> registration(s)</li>` : ""}
            ${activeBadges  > 0 ? `<li><b>${activeBadges}</b> active badge(s)</li>`  : ""}
            ${invitations   > 0 ? `<li><b>${invitations}</b> invitation(s)</li>`     : ""}
          </ul>
          <p style="color:#b91c1c;margin-top:8px;font-size:0.85em;">All badges registered under this exhibitor will be <b>permanently removed</b>. <b>This cannot be undone.</b></p>
        </div>`
      : "";

    const { isConfirmed } = await Swal.fire({
      title: `Delete "${item.company_name}"?`,
      icon: "warning",
      html: `
        <div style="text-align:left;">
          <p style="color:#374151;">You are about to permanently delete this exhibitor account:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:10px 0;">
            <p style="margin:4px 0;"><b>Company:</b> ${item.company_name}</p>
            <p style="margin:4px 0;"><b>Contact:</b> ${item.contact_person}</p>
            <p style="margin:4px 0;"><b>Email:</b> ${item.contact_email}</p>
          </div>
          ${dataWarningHtml}
        </div>`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete permanently",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      width: 520,
    });

    if (!isConfirmed) return;

    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await exhibitorService.deleteExhibitor(item.id);
      Swal.fire({ icon: "success", title: "Deleted!", text: "Exhibitor permanently removed." });
      loadExhibitors();
    } catch (error) {
      Swal.fire("Error", getServiceErrorMessage(error, "Deletion failed"), "error");
    }
  };

  const stats = [
    { label: "Total",    value: exhibitors.length,                                       color: "text-slate-700"  },
    { label: "Active",   value: exhibitors.filter((e) => e.status === "active").length,  color: "text-emerald-600"},
    { label: "Inactive", value: exhibitors.filter((e) => e.status !== "active").length,  color: "text-red-500"    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Allocation Panel (modal) ── */}
      {allocationTarget && (
        <BadgeAllocationPanel
          exhibitor={allocationTarget}
          onClose={() => setAllocationTarget(null)}
          onSaved={loadExhibitors}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Exhibitor Management</h2>
            <p className="text-sm text-slate-500">Manage exhibitor accounts and badge allocations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadExhibitors}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={createExhibitor}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} />
            Create Exhibitor
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading exhibitors…
          </div>
        ) : exhibitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Users size={36} className="text-slate-300" />
            <p className="text-sm">No exhibitors yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Company", "Contact Person", "Email", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {exhibitors.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{item.company_name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{item.contact_person}</td>
                  <td className="px-5 py-3.5 text-slate-500">{item.contact_email}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => viewExhibitor(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Eye size={13} />
                        View
                      </button>

                      <button
                        onClick={() => setAllocationTarget(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                      >
                        <Shield size={13} />
                        Allocate Badges
                      </button>

                      <button
                        onClick={() => deleteExhibitor(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExhibitorManagement;