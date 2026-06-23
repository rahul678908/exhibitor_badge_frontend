import { useState, useEffect } from "react";
import api from "../utils/axios"; // ← adjust to your axios instance path

// ─── tiny helpers ──────────────────────────────────────────────────────────────

function InfoRow({ label, value, valueClass = "" }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${valueClass}`}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function BatchDeleteModal({ onClose, onDeleted }) {
  // "select" → "confirm" → "done"
  const [step, setStep] = useState("select");

  const [batches, setBatches] = useState([]);
  const [fetchingBatches, setFetchingBatches] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [selectedId, setSelectedId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);

  // ── load batches on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setFetchingBatches(true);
      setFetchError(null);
      try {
        const res = await api.get("/exhibitor/bulk-upload/batches/");
        // Only completed batches have committed registrations that can be deleted
        const completed = (res.data || []).filter((b) => b.status === "completed");
        setBatches(completed);
      } catch {
        setFetchError("Could not load batches. Please close and try again.");
      } finally {
        setFetchingBatches(false);
      }
    };
    load();
  }, []);

  // derived
  const selectedBatch = batches.find((b) => String(b.id) === String(selectedId)) ?? null;

  // ── delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedBatch) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(
        `/exhibitor/bulk-upload/${selectedBatch.id}/delete-registrations/`
      );
      setDeleteResult(res.data);
      setStep("done");
      onDeleted?.();
    } catch (err) {
      // Surface the backend error message if present
      const msg =
        err?.response?.data?.error ||
        "Deletion failed. Please try again.";
      setDeleteError(msg);
      setStep("select"); // let user pick again
    } finally {
      setDeleting(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Delete registrations by batch
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── STEP: select ─────────────────────────────────────────────── */}
          {step === "select" && (
            <>
              {fetchingBatches && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
                  <Spinner />
                  Loading batches…
                </div>
              )}

              {fetchError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  {fetchError}
                </p>
              )}

              {!fetchingBatches && !fetchError && batches.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm font-medium text-gray-600">No committed batches found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Only batches with committed registrations appear here.
                  </p>
                </div>
              )}

              {!fetchingBatches && !fetchError && batches.length > 0 && (
                <>
                  {/* Dropdown */}
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select batch
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setDeleteError(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">— Choose a batch —</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_name}
                        {b.total_records ? ` (${b.total_records} records)` : ""}
                      </option>
                    ))}
                  </select>

                  {/* Selected batch info card */}
                  {selectedBatch && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <InfoRow label="Batch name" value={selectedBatch.batch_name} />
                      <InfoRow
                        label="File"
                        value={selectedBatch.file_name}
                        valueClass="text-xs truncate max-w-[180px]"
                      />
                      <InfoRow label="Total records" value={selectedBatch.total_records} />
                      <InfoRow
                        label="Valid"
                        value={selectedBatch.valid_records}
                        valueClass="text-green-700"
                      />
                      <InfoRow
                        label="Uploaded"
                        value={new Date(selectedBatch.uploaded_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      />
                    </div>
                  )}
                </>
              )}

              {/* API / delete error after a failed attempt */}
              {deleteError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  {deleteError}
                </p>
              )}

              {/* Footer */}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!selectedBatch}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ── STEP: confirm ────────────────────────────────────────────── */}
          {step === "confirm" && selectedBatch && (
            <>
              <div className="flex items-start gap-4">
                {/* Warning icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    This cannot be undone
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    You are about to permanently delete all registrations from:
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    "{selectedBatch.batch_name}"
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedBatch.valid_records} registration
                    {selectedBatch.valid_records !== 1 ? "s" : ""} will be removed.
                  </p>
                </div>
              </div>

              {deleteError && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setStep("select")}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {deleting && <Spinner />}
                  {deleting ? "Deleting…" : "Yes, delete all"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: done ───────────────────────────────────────────────── */}
          {step === "done" && deleteResult && (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <p className="text-base font-semibold text-gray-900">
                  {deleteResult.deleted_count} registration
                  {deleteResult.deleted_count !== 1 ? "s" : ""} deleted
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  The batch has been reverted to validated status.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-1 px-6 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}