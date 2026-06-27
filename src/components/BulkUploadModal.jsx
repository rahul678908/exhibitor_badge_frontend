import { useState, useRef, useEffect } from "react";
  import {
    FaTimes,
    FaCloudUploadAlt,
    FaDownload,
    FaCheckCircle,
    FaExclamationCircle,
    FaEdit,
    FaSave,
    FaSpinner,
    FaHistory,
    FaPlus,
    FaArrowRight,
    FaFileExcel,
    FaTrash,
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
  } from "react-icons/fa";
  import Swal from "sweetalert2";
  import api from "../utils/axios";

  const SYSTEM_FIELDS = [
    { key: "first_name",          label: "First Name",          required: true  },
    { key: "last_name",           label: "Last Name",           required: true  },
    { key: "email",               label: "Email",               required: true  },
    { key: "job_title",           label: "Job Title",           required: false },
    { key: "company_name",        label: "Company Name",        required: false },
    { key: "phone_number",        label: "Phone Number",        required: false },
    { key: "country_of_residence",label: "Country Of Residence",required: false },
    { key: "nationality",         label: "Nationality",         required: false },
    { key: "ticket_type",         label: "Ticket Type",         required: true  },
  ];

  const STEPS = ["Upload", "Map Fields", "Review & Commit"];
  const PAGE_SIZE = 25;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const STATUS_CONFIG = {
    uploaded:   { label: "Uploaded",   bg: "bg-gray-100",  text: "text-gray-600",  dot: "bg-gray-400"  },
    processing: { label: "Processing", bg: "bg-blue-100",  text: "text-blue-700",  dot: "bg-blue-500"  },
    validated:  { label: "Validated",  bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
    completed:  { label: "Completed",  bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    failed:     { label: "Failed",     bg: "bg-red-100",   text: "text-red-600",   dot: "bg-red-500"   },
  };

  function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.uploaded;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  // ── BatchProgressBar — pure display component, NO functions inside ─────────────
  function BatchProgressBar({ batch }) {
    const { status, total_records, valid_records, invalid_records, progress_percentage } = batch;

    if (status === "failed") {
      return (
        <div className="mt-2">
          <div className="h-1.5 w-full bg-red-100 rounded-full">
            <div className="h-full w-0 bg-red-400 rounded-full" />
          </div>
          <p className="text-xs text-red-500 mt-1">Processing failed</p>
        </div>
      );
    }

    if (status === "processing" || status === "uploaded") {
      const pct = progress_percentage ?? 0;
      return (
        <div className="mt-2">
          <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {pct}% processed
            {batch.processed_records ? ` · ${batch.processed_records.toLocaleString()} rows` : ""}
          </p>
        </div>
      );
    }

    // validated / completed
    const total      = total_records  || 0;
    const valid      = valid_records  || 0;
    const invalid    = invalid_records|| 0;
    const validPct   = total > 0 ? Math.round((valid   / total) * 100) : 0;
    const invalidPct = total > 0 ? Math.round((invalid / total) * 100) : 0;

    return (
      <div className="mt-2">
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${validPct}%` }} />
          <div className="h-full bg-red-400 transition-all"  style={{ width: `${invalidPct}%` }} />
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-green-600 font-medium">
            {valid.toLocaleString()} valid ({validPct}%)
          </span>
          {invalid > 0 && (
            <span className="text-xs text-red-500">{invalid.toLocaleString()} invalid</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{total.toLocaleString()} total</span>
        </div>
      </div>
    );
  }

  // ── Main Component ─────────────────────────────────────────────────────────────
  export default function BulkUploadModal({ onClose, onSuccess }) {

    // step 0 = batch history, 1 = upload, 2 = map, 3 = review
    const [step, setStep] = useState(0);

    // Step 0
    const [batches, setBatches]           = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(true);

    // Step 1
    const [file, setFile]                 = useState(null);
    const [batchName, setBatchName]       = useState("");
    const [uploading, setUploading]       = useState(false);
    const [uploadResult, setUploadResult] = useState(null);

    // Step 2
    const [mappings, setMappings]         = useState({});
    const [mapping, setMapping]           = useState(false);

    // Step 3
    const [activeTab, setActiveTab]       = useState("all");
    const [batchStatus, setBatchStatus]   = useState(null);
    const [records, setRecords]           = useState([]);
    const [polling, setPolling]           = useState(false);
    const [committing, setCommitting]     = useState(false);

    // Step 3 — search / filter / pagination (backend-driven)
    const [searchInput, setSearchInput]   = useState("");   // raw text box value
    const [searchTerm, setSearchTerm]     = useState("");   // debounced value actually sent to API
    const [ticketFilter, setTicketFilter] = useState("");   // ticket_type id, "" = all
    const [currentPage, setCurrentPage]   = useState(1);
    const [totalCount, setTotalCount]     = useState(0);
    const [hasNext, setHasNext]           = useState(false);
    const [hasPrev, setHasPrev]           = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    // Inline edit
    const [editingRecord, setEditingRecord] = useState(null);
    const [editData, setEditData]           = useState({});
    const [saving, setSaving]               = useState(false);

    const [ticketTypes, setTicketTypes] = useState([]);

    const fileInputRef   = useRef();
    const pollRef         = useRef();
    const committingRef   = useRef(false);
    const debounceRef     = useRef();

    // ── Load batch history on mount ────────────────────────────────
    useEffect(() => {
      loadBatches();

      api.get("admin/tickets/")          // adjust to your actual endpoint
       .then((res) => setTicketTypes(Array.isArray(res.data) ? res.data : res.data.results ?? []))
       .catch(() => {});

      return () => {
        clearTimeout(pollRef.current);
        clearTimeout(debounceRef.current);
      };
    }, []);

    // ── Debounce the search box → searchTerm (the value actually sent to API) ──
    useEffect(() => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchTerm(searchInput.trim());
      }, 400);
      return () => clearTimeout(debounceRef.current);
    }, [searchInput]);

    // ── Whenever search/filter changes, jump back to page 1 and refetch ────────
    useEffect(() => {
      if (step !== 3 || !uploadResult?.batch_id) return;
      setCurrentPage(1);
      fetchReview(uploadResult.batch_id, activeTab, {
        search: searchTerm,
        ticketType: ticketFilter,
        page: 1,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, ticketFilter]);

    const loadBatches = async () => {
      setBatchesLoading(true);
      try {
        const res = await api.get("exhibitor/bulk-upload/batches/");
        setBatches(Array.isArray(res.data) ? res.data : []);
      } catch {
        setBatches([]);
      } finally {
        setBatchesLoading(false);
      }
    };

    // ── Step 0: Delete committed registrations for a batch ─────────
    const handleDeleteCommitted = async (batch) => {
      const { isConfirmed } = await Swal.fire({
        title: "Delete Committed Registrations?",
        html: `
          <div style="text-align:center">
            <p style="color:#374151;font-size:15px">
              This will delete <strong>all registrations</strong> committed from
              batch <strong>"${batch.batch_name}"</strong>.
            </p>
            <p style="color:#9ca3af;font-size:13px;margin-top:8px">
              The batch will return to <b>Validated</b> status so you can re-commit if needed.
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, Delete All",
        cancelButtonText: "Cancel",
      });

      if (!isConfirmed) return;

      try {
        Swal.fire({
          title: "Deleting...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const res = await api.delete(
          `exhibitor/bulk-upload/${batch.id}/delete-registrations/`
        );

        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text: res.data.message,
          timer: 2000,
          showConfirmButton: false,
        });

        loadBatches();   // refresh list → status flips back to "validated"
        onSuccess?.();   // refresh dashboard registrations table

      } catch (err) {
        Swal.fire(
          "Error",
          err?.response?.data?.error || "Failed to delete registrations.",
          "error"
        );
      }
    };

    // ── Step 0: Resume an existing batch ───────────────────────────
    const handleResumeBatch = async (batch) => {
      setUploadResult({ batch_id: batch.id });
      setBatchStatus(batch);
      setStep(3);
      resetReviewFilters();

      if (batch.status === "processing") {
        setPolling(true);
        startPolling(batch.id, "all");
      } else {
        setPolling(false);
        await fetchReview(batch.id, "all", { search: "", ticketType: "", page: 1 });
      }
    };

    const resetReviewFilters = () => {
      setSearchInput("");
      setSearchTerm("");
      setTicketFilter("");
      setCurrentPage(1);
      setTotalCount(0);
      setHasNext(false);
      setHasPrev(false);
    };

    // ── Step 1: Upload ─────────────────────────────────────────────
    const handleFileChange = (e) => {
      const f = e.target.files[0];
      if (f) setFile(f);
    };

    const handleDownloadTemplate = async () => {
      try {
        const res = await api.get("exhibitor/bulk-upload/sample-template/", {
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = "bulk_upload_template.xlsx";
        a.click();
      } catch {
        Swal.fire("Error", "Failed to download template.", "error");
      }
    };

    const handleUpload = async () => {
      if (!file)            return Swal.fire("Required", "Please select a file.", "warning");
      if (!batchName.trim()) return Swal.fire("Required", "Please enter a batch name.", "warning");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("batch_name", batchName.trim());

      setUploading(true);
      try {
        const res = await api.post("exhibitor/bulk-upload/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploadResult(res.data);

        const autoMap = {};
        res.data.columns.forEach((col) => {
          const match = SYSTEM_FIELDS.find(
            (f) => f.label.toLowerCase() === col.toLowerCase()
          );
          if (match) autoMap[col] = match.key;
        });
        setMappings(autoMap);
        setStep(2);
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Upload failed.", "error");
      } finally {
        setUploading(false);
      }
    };

    // ── Step 2: Map Fields ─────────────────────────────────────────
    const handleMappingChange = (sourceCol, targetField) => {
      setMappings((prev) => ({ ...prev, [sourceCol]: targetField }));
    };

    const handleSubmitMapping = async () => {
      const mappedTargets = Object.values(mappings);
      const required = ["first_name", "last_name", "email", "ticket_type"];
      const missing  = required.filter((r) => !mappedTargets.includes(r));

      if (missing.length) {
        return Swal.fire("Required Fields Missing", `Please map: ${missing.join(", ")}`, "warning");
      }

      setMapping(true);
      try {
        await api.post(`exhibitor/bulk-upload/${uploadResult.batch_id}/map/`, { mappings });
        setStep(3);
        resetReviewFilters();
        setPolling(true);
        startPolling(uploadResult.batch_id, "all");
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Mapping failed.", "error");
      } finally {
        setMapping(false);
      }
    };

    // ── Step 3: Polling ────────────────────────────────────────────
    // opts carries the currently-active search/filter/page so polling doesn't
    // silently reset whatever the user was looking at while validation finishes.
    const startPolling = (batchId, tab, opts = {}) => {
      clearTimeout(pollRef.current);
      let attempts = 0;

      const poll = async () => {
        attempts++;
        const done = await fetchReview(batchId, tab, opts);
        if (done) {
          setPolling(false);
          return;
        }
        const interval = attempts < 4 ? 1000 : attempts < 10 ? 2000 : 3000;
        pollRef.current = setTimeout(poll, interval);
      };

      poll();
    };

    // opts: { search, ticketType, page } — all optional, default to current state
    const fetchReview = async (batchId, tab, opts = {}) => {
      const search     = opts.search     ?? searchTerm;
      const ticketType = opts.ticketType ?? ticketFilter;
      const page        = opts.page        ?? currentPage;

      setReviewLoading(true);
      try {
        const params = new URLSearchParams({
          tab,
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (search) params.set("search", search);
        if (ticketType) params.set("ticket_type", ticketType);

        const res = await api.get(
          `exhibitor/bulk-upload/${batchId}/review/?${params.toString()}`
        );

        // While still processing, backend returns the plain (non-paginated) shape.
        // Once validated/completed, it returns DRF's {count, next, previous, results}.
        const isPaginated = res.data && typeof res.data.count !== "undefined";
        const data = isPaginated ? res.data.results : res.data;

        setBatchStatus(data);

        if (isPaginated) {
          setTotalCount(res.data.count ?? 0);
          setHasNext(!!res.data.next);
          setHasPrev(!!res.data.previous);
        } else {
          setTotalCount(0);
          setHasNext(false);
          setHasPrev(false);
        }

        if (data.status === "validated" || data.status === "completed") {
          setRecords(data.records || []);

          if (committingRef.current) {
            committingRef.current = false;
            clearTimeout(pollRef.current);
            setPolling(false);

            if (data.status === "completed") {
              await Swal.fire({
                icon: "success",
                title: "Committed!",
                text: `${(data.valid_records ?? 0).toLocaleString()} records are now in registrations.`,
                timer: 2500,
                showConfirmButton: false,
              });
              onSuccess?.();
              onClose();
            }
          }

          return true;
        }

        if (data.status === "failed") {
          clearTimeout(pollRef.current);
          setPolling(false);

          if (committingRef.current) {
            committingRef.current = false;
            Swal.fire("Commit Failed", "Something went wrong. Please try again.", "error");
          } else {
            Swal.fire("Processing Failed", "File processing failed. Please re-upload.", "error");
          }

          return true;
        }

        return false;
      } catch (error) {
        console.error("Review fetch failed:", error);
        return false;
      } finally {
        setReviewLoading(false);
      }
    };

    const handleTabChange = (tab) => {
      setActiveTab(tab);
      setCurrentPage(1);
      if (uploadResult?.batch_id) {
        fetchReview(uploadResult.batch_id, tab, {
          search: searchTerm,
          ticketType: ticketFilter,
          page: 1,
        });
      }
    };

    const goToPage = (page) => {
      if (page < 1) return;
      setCurrentPage(page);
      if (uploadResult?.batch_id) {
        fetchReview(uploadResult.batch_id, activeTab, {
          search: searchTerm,
          ticketType: ticketFilter,
          page,
        });
      }
    };

    const handleCommit = async () => {
      const result = await Swal.fire({
        title: "Commit Records",
        text: `Insert ${batchStatus?.valid_records?.toLocaleString()} valid records into Registrations?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Commit",
      });
      if (!result.isConfirmed) return;

      setCommitting(true);
      try {
        await api.post(`exhibitor/bulk-upload/${uploadResult.batch_id}/commit/`);
        committingRef.current = true;
        setPolling(true);
        startPolling(uploadResult.batch_id, activeTab, {
          search: searchTerm,
          ticketType: ticketFilter,
          page: currentPage,
        });
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Commit failed.", "error");
      } finally {
        setCommitting(false);
      }
    };

    // ── Inline edit ────────────────────────────────────────────────
    const startEdit = (record) => {
      setEditingRecord(record.id);
      setEditData({
        first_name:           record.first_name,
        last_name:            record.last_name,
        email:                record.email,
        job_title:            record.job_title,
        company_name:         record.company_name,
        phone_number:         record.phone_number,
        country_of_residence: record.country_of_residence,
        nationality:          record.nationality,
        ticket_type:          record.ticket_type,
      });
    };

    const handleSaveEdit = async (recordId) => {
      setSaving(true);
      try {
        const payload = {
          ...editData,
          ticket_type: editData.ticket_type         // <select> gives a string
            ? Number(editData.ticket_type)           // ← coerce to int for the FK
            : null,
        };

        const res = await api.patch(
          `/exhibitor/bulk-upload/record/${recordId}/edit/`,
          payload
        );

        // Update the record in local state without a full refetch
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? res.data.record : r))
        );

        // Sync the batch counters
        setBatchStatus((prev) => ({
          ...prev,
          valid_records:   res.data.batch_valid_records,
          invalid_records: res.data.batch_invalid_records,
        }));

        setEditingRecord(null);
        setEditData({});
      } finally {
        setSaving(false);
      }
    };

    const isValidated =
      batchStatus?.status === "validated" || batchStatus?.status === "completed";

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd   = Math.min(currentPage * PAGE_SIZE, totalCount);

    // ── Render ─────────────────────────────────────────────────────
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white w-full max-w-full sm:max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
          
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
            style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
          >
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-lg">
                {step === 0 ? <FaHistory size={18} /> : <FaCloudUploadAlt size={18} />}
              </div>
              <h2 className="text-xl font-bold">
                {step === 0 ? "Bulk Upload Batches" : "Bulk Upload"}
              </h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition text-xl">
              <FaTimes />
            </button>
          </div>

          {/* Step Indicator */}
          {step >= 1 && (
            <div className="flex items-center justify-center gap-0 px-8 pt-5 pb-2">
              {STEPS.map((label, i) => {
                const num    = i + 1;
                const active = step === num;
                const done   = step > num;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                        ${done   ? "bg-green-500 border-green-500 text-white"
                        : active ? "border-purple-700 bg-purple-700 text-white"
                        :          "border-gray-300 text-gray-400"}`}
                      >
                        {done ? <FaCheckCircle size={14} /> : num}
                      </div>
                      <span className={`text-xs mt-1 font-medium ${
                        active ? "text-purple-700" : done ? "text-green-600" : "text-gray-400"
                      }`}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 w-20 mx-2 mb-4 ${done ? "bg-green-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-4">

            {/* ══ STEP 0 — Batch History ══ */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Upload History</h3>
                    <p className="text-sm text-gray-500">
                      {batches.length} batch{batches.length !== 1 ? "es" : ""} uploaded
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    <FaPlus size={12} /> New Upload
                  </button>
                </div>

                {batchesLoading && (
                  <div className="flex items-center justify-center py-12 text-gray-400">
                    <FaSpinner className="animate-spin mr-2" /> Loading batches...
                  </div>
                )}

                {!batchesLoading && batches.length === 0 && (
                  <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl">
                    <FaCloudUploadAlt size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No batches yet</p>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Upload your first Excel file to get started</p>
                    <button
                      onClick={() => setStep(1)}
                      className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
                    >
                      Upload Now
                    </button>
                  </div>
                )}

                {!batchesLoading && batches.map((batch) => (
                  <div key={batch.id} className="border rounded-2xl p-5 hover:shadow-md transition-shadow bg-white">

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 flex items-center justify-center">
                          <FaFileExcel className="text-green-600" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{batch.batch_name}</p>
                          <p className="text-xs text-gray-400 truncate">{batch.file_name}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={batch.status} />

                        {(batch.status === "validated" || batch.status === "completed" || batch.status === "processing") && (
                          <button
                            onClick={() => handleResumeBatch(batch)}
                            className="flex items-center gap-1.5 text-purple-700 hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            {batch.status === "processing" ? (
                              <><FaSpinner className="animate-spin" size={10} /> Monitor</>
                            ) : batch.status === "validated" ? (
                              <><FaArrowRight size={10} /> Resume</>
                            ) : (
                              <><FaCheckCircle size={10} /> View</>
                            )}
                          </button>
                        )}

                        {/* Delete committed — only for completed batches */}
                        {batch.status === "completed" && (
                          <button
                            onClick={() => handleDeleteCommitted(batch)}
                            className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <FaTrash size={10} />
                            Delete Committed
                          </button>
                        )}
                      </div>
                    </div>

                    <BatchProgressBar batch={batch} />

                    {/* Meta */}
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created by</p>
                        <p className="text-xs font-medium text-gray-700">
                          {batch.created_by || batch.exhibitor?.company_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created at</p>
                        <p className="text-xs font-medium text-gray-700">{formatDateTime(batch.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Uploaded at</p>
                        <p className="text-xs font-medium text-gray-700">{formatDateTime(batch.uploaded_at || batch.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ STEP 1 — Upload ══ */}
            {step === 1 && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                  <FaCloudUploadAlt size={36} className="text-red-500" />
                </div>
                <p className="text-gray-500">Upload your Excel file with badge details</p>

                <div className="w-full">
                  <label className="block text-sm font-semibold mb-1">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. GULFOOD 2026 - Wave 1"
                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-semibold mb-1">
                    Select Excel File <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="bg-gray-100 border-r px-4 py-2.5 text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Choose File
                    </button>
                    <span className="px-4 text-gray-500 text-sm">
                      {file ? file.name : "No file chosen"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Supported: .xlsx, .xls, .csv · No size limit</p>
                </div>

                <div className="w-full bg-gray-50 border rounded-xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <FaDownload /> Need the template?
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 border border-red-500 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <FaDownload /> Download Template
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — Map Fields ══ */}
            {step === 2 && uploadResult && (
              <div className="space-y-4">
                <p className="text-gray-500 text-sm">
                  Match your file's columns to the system fields. Required fields are marked{" "}
                  <span className="text-red-500">*</span>.
                </p>

                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {uploadResult.columns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.preview_rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-t">
                          {uploadResult.columns.map((col) => (
                            <td key={col} className="px-3 py-2 text-gray-500 whitespace-nowrap">
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Field Mapping</h3>
                  {uploadResult.columns.map((col) => (
                    <div key={col} className="flex items-center gap-4">
                      <div className="w-1/2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm font-medium text-purple-800">
                        {col}
                      </div>
                      <span className="text-gray-400">→</span>
                      <select
                        value={mappings[col] || ""}
                        onChange={(e) => handleMappingChange(col, e.target.value)}
                        className="w-1/2 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">-- Skip this column --</option>
                        {SYSTEM_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}{f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ STEP 3 — Review & Commit ══ */}
            {step === 3 && (
              <div className="space-y-4">

                {batchStatus && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center border">
                      <p className="text-2xl font-bold text-gray-700">
                        {(batchStatus.total_records ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Total Records</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                      <p className="text-2xl font-bold text-green-600">
                        {(batchStatus.valid_records ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Valid</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                      <p className="text-2xl font-bold text-red-500">
                        {(batchStatus.invalid_records ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Invalid</p>
                    </div>
                  </div>
                )}

                {polling && !isValidated && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                    <div className="flex items-center gap-3 text-blue-700 text-sm mb-2">
                      <FaSpinner className="animate-spin shrink-0" />
                      <span className="font-medium">
                        {(batchStatus?.progress_percentage ?? 0) < 30
                          ? "Reading and parsing file..."
                          : (batchStatus?.progress_percentage ?? 0) < 80
                          ? "Validating records..."
                          : "Almost done, writing results..."}
                      </span>
                      <span className="ml-auto font-bold">{batchStatus?.progress_percentage ?? 0}%</span>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${batchStatus?.progress_percentage ?? 0}%` }}
                      />
                    </div>
                    {batchStatus?.processed_records > 0 && (
                      <p className="text-xs text-blue-500 mt-1.5">
                        {batchStatus.processed_records.toLocaleString()} of {batchStatus.total_records.toLocaleString()} rows processed
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-1 border-b">
                  {["all", "valid", "invalid"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-purple-700 text-purple-700"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab === "all"     && `All (${batchStatus?.total_records ?? 0})`}
                      {tab === "valid"   && `Valid (${batchStatus?.valid_records ?? 0})`}
                      {tab === "invalid" && `Invalid (${batchStatus?.invalid_records ?? 0})`}
                    </button>
                  ))}
                </div>

                {/* ── Search + Ticket Type Filter ───────────────────────────── */}
                {isValidated && (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* <div className="relative flex-1 min-w-[220px]">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div> */}

                    {/* <select
                      value={ticketFilter}
                      onChange={(e) => setTicketFilter(e.target.value)}
                      className="border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-[180px]"
                    >
                      <option value="">All Ticket Types</option>
                      {ticketTypes.map((tt) => (
                        <option key={tt.id} value={tt.id}>{tt.ticket_name}</option>
                      ))}
                    </select> */}

                    {reviewLoading && (
                      <FaSpinner className="animate-spin text-purple-500 text-sm shrink-0" />
                    )}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">First Name</th>
                        <th className="px-3 py-2 text-left">Last Name</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Job Title</th>
                        <th className="px-3 py-2 text-left">Company</th>
                        <th className="px-3 py-2 text-left">Ticket Type</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Error</th>
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center py-8 text-gray-400">
                            {polling
                              ? "Validating..."
                              : (searchTerm || ticketFilter)
                              ? "No records match your search/filter."
                              : "No records found."}
                          </td>
                        </tr>
                      ) : (
                        records.map((rec) => (
                          <tr key={rec.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{rec.row_number}</td>

                            {editingRecord === rec.id ? (
                              <>
                                {["first_name", "last_name", "email", "job_title", "company_name"].map((f) => (
                                  <td key={f} className="px-2 py-1">
                                    <input
                                      value={editData[f] || ""}
                                      onChange={(e) => setEditData((p) => ({ ...p, [f]: e.target.value }))}
                                      className="border rounded px-2 py-1 w-full text-xs focus:ring-1 focus:ring-purple-400 outline-none"
                                    />
                                  </td>
                                ))}
                                <td className="px-2 py-1">
                                  <select
                                    value={String(editData.ticket_type ?? "")}
                                    onChange={(e) => setEditData((p) => ({ ...p, ticket_type: e.target.value }))}
                                    className="border rounded px-2 py-1 w-full text-xs focus:ring-1 focus:ring-purple-400 outline-none"
                                  >
                                    <option value="" disabled>— select ticket type —</option>
                                    {ticketTypes.map((tt) => (
                                      <option key={tt.id} value={tt.id}>{tt.ticket_name}</option>
                                    ))}
                                  </select>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2">{rec.first_name}</td>
                                <td className="px-3 py-2">{rec.last_name}</td>
                                <td className="px-3 py-2">{rec.email}</td>
                                <td className="px-3 py-2">{rec.job_title}</td>
                                <td className="px-3 py-2">{rec.company_name}</td>
                                <td className="px-3 py-2">{rec.ticket_type_name || "—"}</td>
                              </>
                            )}

                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.validation_status === "valid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}>
                                {rec.validation_status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-red-500 text-xs max-w-[160px] truncate" title={rec.error_message}>
                              {rec.error_message || "—"}
                            </td>
                            <td className="px-3 py-2">
                              {editingRecord === rec.id ? (
                                <button
                                  onClick={() => handleSaveEdit(rec.id)}
                                  disabled={saving}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                                >
                                  {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                  Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEdit(rec)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                                >
                                  <FaEdit /> Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination (backend-driven) ───────────────────────────── */}
                {isValidated && totalCount > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-gray-500">
                      Showing <span className="font-medium text-gray-700">{rangeStart}</span>–
                      <span className="font-medium text-gray-700">{rangeEnd}</span> of{" "}
                      <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span> records
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={!hasPrev || reviewLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <FaChevronLeft size={10} /> Prev
                      </button>
                      <span className="text-xs text-gray-500 px-2">
                        Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
                        <span className="font-semibold text-gray-700">{totalPages}</span>
                      </span>
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={!hasNext || reviewLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Next <FaChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-8 py-4 border-t bg-gray-50 rounded-b-2xl">
            {step === 0 && (
              <>
                <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition">
                  Close
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-6 py-2.5 rounded-lg font-medium transition"
                >
                  <FaPlus size={12} /> New Upload
                </button>
              </>
            )}

            {step === 1 && (
              <>
                <button onClick={() => setStep(0)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition">
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition"
                >
                  {uploading ? <FaSpinner className="animate-spin" /> : <FaCloudUploadAlt />}
                  {uploading ? "Uploading..." : "Upload & Process"}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition">
                  Back
                </button>
                <button
                  onClick={handleSubmitMapping}
                  disabled={mapping}
                  className="px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition"
                  style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
                >
                  {mapping && <FaSpinner className="animate-spin" />}
                  {mapping ? "Processing..." : "Confirm Mapping & Validate"}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button onClick={() => setStep(0)} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition">
                  Back to History
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing || !isValidated || (batchStatus?.valid_records ?? 0) === 0}
                  className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition ${
                    isValidated && (batchStatus?.valid_records ?? 0) > 0
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {committing ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  {committing
                    ? "Committing..."
                    : `Commit ${(batchStatus?.valid_records ?? 0).toLocaleString()} Valid Records`}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    );
  } 