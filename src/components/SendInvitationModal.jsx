import { useState, useRef, useEffect } from "react";
import {
  FaTimes,
  FaEnvelope,
  FaCloudUploadAlt,
  FaPlus,
  FaTrash,
  FaPaperPlane,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../utils/axios";

const EMPTY_ENTRY = () => ({
  first_name: "",
  last_name: "",
  email: "",
  ticket_type_id: "",
});

const FieldError = ({ message }) =>
  message ? <p className="text-red-500 text-xs mt-1">{message}</p> : null;

export default function SendInvitationModal({ onClose, onSuccess }) {
  const [entries, setEntries] = useState([EMPTY_ENTRY()]);
  const [errors, setErrors] = useState([{}]);   // parallel array, one error-object per entry
  const [formError, setFormError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef();

  // Load ticket types
  useEffect(() => {
      api.get("exhibitor/my-allocations/").then((res) => {
          const mapped = res.data
              .filter((a) => a.available_count > 0)
              .map((a) => ({
                  id: a.ticket_type,
                  ticket_name: a.ticket_name,
                  available_count: a.available_count,
                  status: "active",
              }));
          setTickets(mapped);
      }).catch(() => {});
  }, []);

  // ── Entry management ─────────────────────────────────────────────
  const addEntry = () => {
    setEntries((prev) => [...prev, EMPTY_ENTRY()]);
    setErrors((prev) => [...prev, {}]);
  };

  const removeEntry = (idx) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setErrors((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx, field, value) => {
      const textOnlyFields = ["first_name", "last_name"];
      if (textOnlyFields.includes(field) && /\d/.test(value)) return;


    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
    // clear that one field's error as soon as the user edits it
    setErrors((prev) => {
      if (!prev[idx]?.[field]) return prev;
      const next = [...prev];
      const rowErrors = { ...next[idx] };
      delete rowErrors[field];
      next[idx] = rowErrors;
      return next;
    });
  };

  // ── Import from file ─────────────────────────────────────────────
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    try {
      const res = await api.post("exhibitor/invitations/import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imported = res.data.entries.map((entry) => ({
        first_name: entry.first_name || "",
        last_name: entry.last_name || "",
        email: entry.email || "",
        ticket_type_id:
          tickets.find(
            (t) =>
              t.ticket_name.toLowerCase() ===
              (entry.ticket_type_name || "").toLowerCase()
          )?.id || "",
      }));

      const finalEntries = imported.length ? imported : [EMPTY_ENTRY()];
      setEntries(finalEntries);
      setErrors(finalEntries.map(() => ({})));
      setFormError("");

      Swal.fire({
        icon: "success",
        title: `${res.data.total} contacts imported`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire("Error", "Failed to import file.", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // ── Client-side validation ────────────────────────────────────────
  const validateEntries = () => {
    const newErrors = entries.map(() => ({}));
    const seenEmails = new Map(); // lowercase email -> first index it appeared at

    entries.forEach((entry, idx) => {
      const rowErrors = {};

      if (!entry.first_name.trim()) rowErrors.first_name = "Required";
      if (!entry.last_name.trim())  rowErrors.last_name  = "Required";

      const email = entry.email.trim();
      if (!email) {
        rowErrors.email = "Required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.email = "Invalid email address";
      } else {
        const key = email.toLowerCase();
        if (seenEmails.has(key)) {
          rowErrors.email = "Duplicate email in this list";
          const firstIdx = seenEmails.get(key);
          newErrors[firstIdx].email = "Duplicate email in this list";
        } else {
          seenEmails.set(key, idx);
        }
      }

      if (!entry.ticket_type_id) rowErrors.ticket_type_id = "Please select a ticket";

      newErrors[idx] = { ...newErrors[idx], ...rowErrors };
    });

    const hasErrors = newErrors.some((e) => Object.keys(e).length > 0);
    return { newErrors, hasErrors };
  };

  // ── Send invitations ─────────────────────────────────────────────
  const handleSend = async () => {
    setFormError("");

    const { newErrors, hasErrors } = validateEntries();
    if (hasErrors) {
      setErrors(newErrors);
      return; // ⛔ blocks the request entirely until every row is valid
    }
    setErrors(entries.map(() => ({})));

    setSending(true);
    try {
      const payload = entries.map((e) => ({
        first_name: e.first_name.trim(),
        last_name: e.last_name.trim(),
        email: e.email.trim(),
        ticket_type_id: e.ticket_type_id,
      }));

      const res = await api.post("exhibitor/invitations/send/", { entries: payload });
      const { created, failed, errors: serverErrors } = res.data;

      if (failed > 0 && Array.isArray(serverErrors) && serverErrors.length > 0) {
        // Keep only the rows that actually failed, with their real error inline.
        const failedEmails = new Set(
          serverErrors.map((se) => se.email?.toLowerCase())
        );
        const remainingEntries = entries.filter((e) =>
          failedEmails.has(e.email.trim().toLowerCase())
        );
        const remainingErrors = remainingEntries.map((entry) => {
          const match = serverErrors.find(
            (se) => se.email?.toLowerCase() === entry.email.trim().toLowerCase()
          );
          return match ? { email: match.errors.join(" ") } : {};
        });

        setEntries(remainingEntries.length ? remainingEntries : [EMPTY_ENTRY()]);
        setErrors(remainingErrors.length ? remainingErrors : [{}]);

        await Swal.fire({
          icon: "warning",
          title: `${created} sent, ${failed} failed`,
          text: "The failed entries are still below — fix the highlighted fields and send again.",
        });

        onSuccess?.(); // refresh dashboard, since the successful ones were created
        // modal stays open so the failed rows can be fixed and resent
      } else {
        await Swal.fire({
          icon: "success",
          title: `${created} invitation${created > 1 ? "s" : ""} created!`,
          text: "Invitation links are now available in the registrations list.",
          timer: 2000,
          showConfirmButton: false,
        });

        onSuccess?.();
        onClose();
      }
    } catch (err) {
      const data = err.response?.data;

      if (data && Array.isArray(data.errors) && data.errors.length > 0) {
        const mapped = entries.map((entry) => {
          const match = data.errors.find(
            (se) => se.email?.toLowerCase() === entry.email.trim().toLowerCase()
          );
          return match ? { email: match.errors.join(" ") } : {};
        });
        setErrors(mapped);
        setFormError(data.error || "Some entries could not be processed.");
      } else {
        setFormError(data?.error || "Failed to send invitations.");
      }
    } finally {
      setSending(false);
    }
  };

  const hasAnyError = errors.some((e) => Object.keys(e).length > 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white w-full max-w-full sm:max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
        >
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-lg">
              <FaEnvelope size={18} />
            </div>
            <h2 className="text-xl font-bold">Send Invitations</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition text-xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          {/* Entries */}
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const rowErrors = errors[idx] || {};
              const hasRowError = Object.keys(rowErrors).length > 0;

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-3 rounded-lg border transition ${
                    hasRowError ? "border-red-300 bg-red-50/60" : "border-gray-100"
                  }`}
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={entry.first_name}
                      onChange={(e) => updateEntry(idx, "first_name", e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                        rowErrors.first_name ? "border-red-400" : ""
                      }`}
                    />
                    <FieldError message={rowErrors.first_name} />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={entry.last_name}
                      onChange={(e) => updateEntry(idx, "last_name", e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                        rowErrors.last_name ? "border-red-400" : ""
                      }`}
                    />
                    <FieldError message={rowErrors.last_name} />
                  </div>

                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="Email"
                      value={entry.email}
                      onChange={(e) => updateEntry(idx, "email", e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                        rowErrors.email ? "border-red-400" : ""
                      }`}
                    />
                    <FieldError message={rowErrors.email} />
                  </div>

                  <div className="flex-1">
                    <select
                      value={entry.ticket_type_id}
                      onChange={(e) => updateEntry(idx, "ticket_type_id", e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 text-gray-600 ${
                        rowErrors.ticket_type_id ? "border-red-400" : ""
                      }`}
                    >
                      <option value="">Select Ticket</option>
                      {tickets.map((t) => (
                          <option key={t.id} value={t.id}>
                              {t.ticket_name} ({t.available_count} available)
                          </option>
                      ))}
                    </select>
                    <FieldError message={rowErrors.ticket_type_id} />
                  </div>

                  <button
                    onClick={() => removeEntry(idx)}
                    disabled={entries.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 p-2 transition mt-0.5"
                  >
                    <FaTrash />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Entry */}
          <button
            onClick={addEntry}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-lg text-white font-medium transition"
            style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
          >
            <FaPlus />
            Add Entry
          </button>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-2.5 rounded-lg font-medium transition"
            >
              {sending ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaPaperPlane />
              )}
              {sending ? "Sending..." : "Send Invitation"}
            </button>

            <button
              onClick={onClose}
              disabled={sending}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-100 px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-60"
            >
              <FaTimes />
              Close
            </button>
          </div>

          <p className="text-xs flex items-center gap-1 text-gray-400">
            <FaExclamationCircle />
            {hasAnyError ? "Please fix the highlighted fields above" : "All fields required"}
          </p>
        </div>

      </div>
    </div>
  );
}