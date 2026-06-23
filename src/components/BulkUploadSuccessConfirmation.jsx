// BulkUploadSuccessConfirmation.jsx
// Drop this into your bulk upload flow.
// Show it when polling detects batch.status === "completed".
//
// Props:
//   batchName       string   — name of the committed batch
//   committedCount  number   — how many records were actually committed
//   onDone          fn       — called when user closes / clicks "Done"
//   onViewRecords   fn?      — optional: navigate to registration list

export default function BulkUploadSuccessConfirmation({
  batchName,
  committedCount,
  onDone,
  onViewRecords,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Top accent stripe */}
        <div className="h-1.5 bg-gradient-to-r from-purple-600 to-purple-400" />

        <div className="px-8 py-8 flex flex-col items-center text-center gap-4">

          {/* Animated check circle */}
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Upload committed successfully
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              All valid records from{" "}
              <span className="font-medium text-gray-700">"{batchName}"</span>{" "}
              have been saved.
            </p>
          </div>

          {/* Stats pill */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 w-full">
            <p className="text-2xl font-bold text-green-700">{committedCount}</p>
            <p className="text-xs text-green-600 mt-0.5">
              registration{committedCount !== 1 ? "s" : ""} added
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full mt-1">
            {onViewRecords && (
              <button
                onClick={onViewRecords}
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                View registrations
              </button>
            )}
            <button
              onClick={onDone}
              className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
                onViewRecords
                  ? "text-gray-500 hover:text-gray-800"
                  : "bg-purple-700 hover:bg-purple-800 text-white"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}