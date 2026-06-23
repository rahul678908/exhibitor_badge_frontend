import React, { useEffect, useState } from "react";
import exhibitorService from "../services/exhibitorService";
import Swal from "sweetalert2";
import { Eye, Plus, RefreshCw, Users, Trash2 } from "lucide-react";

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

// ─── Shared form HTML for create / edit ──────────────────────────────────────
const exhibitorFormHtml = (defaults = {}) => `
  <input id="username"       class="swal2-input" placeholder="Username"       value="${defaults.username       ?? ""}">
  <input id="password"       class="swal2-input" placeholder="Password${defaults.username ? " (leave blank to keep)" : ""}" type="password">
  <input id="company_name"   class="swal2-input" placeholder="Company Name"   value="${defaults.company_name   ?? ""}">
  <input id="contact_person" class="swal2-input" placeholder="Contact Person" value="${defaults.contact_person ?? ""}">
  <input id="contact_email"  class="swal2-input" placeholder="Contact Email"  value="${defaults.contact_email  ?? ""}">
  <input id="contact_phone"  class="swal2-input" placeholder="Contact Phone"  value="${defaults.contact_phone  ?? ""}">
`;

const collectFormValues = (includePassword = true) => {
  const values = {
    username:       document.getElementById("username").value,
    company_name:   document.getElementById("company_name").value,
    contact_person: document.getElementById("contact_person").value,
    contact_email:  document.getElementById("contact_email").value,
    contact_phone:  document.getElementById("contact_phone").value,
  };
  const pwd = document.getElementById("password").value;
  if (includePassword || pwd) values.password = pwd;
  return values;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ExhibitorManagement = () => {
  const [exhibitors, setExhibitors] = useState([]);
  const [loading, setLoading]       = useState(false);

  const loadExhibitors = async () => {
    try {
      setLoading(true);
      const data = await exhibitorService.getExhibitors();
      setExhibitors(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      Swal.fire("Error", error?.detail || "Failed to load exhibitors", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExhibitors();
  }, []);

  const createExhibitor = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Create Exhibitor",
      width: 700,
      html: exhibitorFormHtml(),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      preConfirm: () => collectFormValues(true),
    });

    if (!formValues) return;

    try {
      Swal.fire({ title: "Creating...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await exhibitorService.createExhibitor(formValues);
      Swal.fire("Created!", "Exhibitor created successfully.", "success");
      loadExhibitors();
    } catch (error) {
      Swal.fire("Error", error?.detail || "Creation failed", "error");
    }
  };

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
    } catch {
      Swal.fire("Error", "Failed to load details", "error");
    }
  };

  const deleteExhibitor = async (item) => {
    const { isConfirmed } = await Swal.fire({
      title: "Delete Exhibitor?",
      text: `This will permanently remove "${item.company_name}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });

    if (!isConfirmed) return;

    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await exhibitorService.deleteExhibitor(item.id);
      Swal.fire("Deleted!", "Exhibitor has been removed.", "success");
      loadExhibitors();
    } catch (error) {
      Swal.fire("Error", error?.detail || "Deletion failed", "error");
    }
  };

  const stats = [
    { label: "Total",    value: exhibitors.length,                                       color: "text-slate-700"  },
    { label: "Active",   value: exhibitors.filter((e) => e.status === "active").length,  color: "text-emerald-600"},
    { label: "Inactive", value: exhibitors.filter((e) => e.status !== "active").length,   color: "text-red-500"   },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Exhibitor Management</h2>
            <p className="text-sm text-slate-500">Manage and monitor all exhibitor accounts</p>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => viewExhibitor(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Eye size={13} />
                        View
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