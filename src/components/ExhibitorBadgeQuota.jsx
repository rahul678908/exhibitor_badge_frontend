/**
 * ExhibitorBadgeQuota.jsx
 *
 * Drop this anywhere in the exhibitor dashboard layout.
 * It fetches the exhibitor's BadgeAllocation rows and renders
 * a compact quota card per ticket type so they always know how
 * many badges they've used vs how many remain before they try
 * to create a badge, bulk upload, or send invitations.
 *
 * Usage:
 *   <ExhibitorBadgeQuota />
 *
 * It re-fetches whenever the `refreshKey` prop changes (increment it
 * after any action that consumes a badge seat):
 *   <ExhibitorBadgeQuota refreshKey={refreshKey} />
 */

import { useEffect, useState } from "react";
import { RefreshCw, Ticket, AlertCircle, CheckCircle } from "lucide-react";
import api from "../utils/axios";

// ─── Quota Bar ────────────────────────────────────────────────────────────────
function QuotaBar({ used, allocated }) {
  const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
  const barColor =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="mt-2">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% used</p>
    </div>
  );
}

// ─── Single Quota Card ────────────────────────────────────────────────────────
function QuotaCard({ alloc }) {
  const { ticket_name, ticket_code, allocated_count, used_count, available_count } = alloc;

  const isExhausted = available_count <= 0;
  const isLow       = !isExhausted && available_count <= 5;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        isExhausted
          ? "border-red-200 bg-red-50"
          : isLow
          ? "border-amber-200 bg-amber-50"
          : "border-slate-100 bg-white"
      }`}
    >
      {/* Ticket name + status icon */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{ticket_name}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{ticket_code}</p>
        </div>
        {isExhausted ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
            <AlertCircle size={11} />
            Exhausted
          </span>
        ) : isLow ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
            <AlertCircle size={11} />
            Low
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
            <CheckCircle size={11} />
            Available
          </span>
        )}
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
        <div>
          <p className="text-lg font-bold text-amber-600">{allocated_count}</p>
          <p className="text-xs text-slate-400">Allocated</p>
        </div>
        <div>
          <p className="text-lg font-bold text-purple-600">{used_count ?? (allocated_count - available_count)}</p>
          <p className="text-xs text-slate-400">Used</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${isExhausted ? "text-red-500" : "text-emerald-600"}`}>
            {available_count}
          </p>
          <p className="text-xs text-slate-400">Remaining</p>
        </div>
      </div>

      <QuotaBar
        used={used_count ?? (allocated_count - available_count)}
        allocated={allocated_count}
      />

      {isExhausted && (
        <p className="text-xs text-red-600 mt-1">
          You have no remaining badges for this type. Contact the administrator to increase your quota.
        </p>
      )}
      {isLow && (
        <p className="text-xs text-amber-700 mt-1">
          Only {available_count} badge{available_count !== 1 ? "s" : ""} remaining — consider requesting more.
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExhibitorBadgeQuota({ refreshKey }) {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // GET /exhibitor/my-allocations/ → returns BadgeAllocationListSerializer data
      const res = await api.get("exhibitor/my-allocations/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      setAllocations(data);
    } catch {
      setError("Failed to load your badge quota. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <RefreshCw size={16} className="animate-spin" />
        Loading your badge quota…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm py-4">
        <AlertCircle size={16} />
        {error}
        <button onClick={load} className="underline ml-1">Retry</button>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-sm">
        <Ticket size={28} className="mx-auto mb-2 text-slate-300" />
        <p>No badge allocation assigned yet.</p>
        <p className="text-xs mt-1">Contact the administrator to request badge quota.</p>
      </div>
    );
  }

  const totalAllocated  = allocations.reduce((s, a) => s + (a.allocated_count  ?? 0), 0);
  const totalUsed       = allocations.reduce((s, a) => s + (a.used_count       ?? (a.allocated_count - a.available_count)), 0);
  const totalAvailable  = allocations.reduce((s, a) => s + (a.available_count  ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
          <p className="text-xl font-bold text-amber-600">{totalAllocated}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Allocated</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-center">
          <p className="text-xl font-bold text-purple-600">{totalUsed}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Used</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 text-center ${totalAvailable <= 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
          <p className={`text-xl font-bold ${totalAvailable <= 0 ? "text-red-500" : "text-emerald-600"}`}>
            {totalAvailable}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Remaining</p>
        </div>
      </div>

      {/* Per-ticket-type cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allocations.map((alloc) => (
          <QuotaCard key={alloc.id} alloc={alloc} />
        ))}
      </div>
    </div>
  );
}