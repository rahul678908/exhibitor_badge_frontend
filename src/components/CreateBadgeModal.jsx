import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import BadgeService from "../services/badgeService";
import TicketService from "../services/allocateBadges";

const FieldError = ({ message }) =>
  message ? <p className="text-red-500 text-xs mt-1">{message}</p> : null;

export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bahrain",
  "Bangladesh","Belgium","Brazil","Canada","China","Colombia","Croatia","Cyprus",
  "Czech Republic","Denmark","Egypt","Ethiopia","Finland","France","Germany",
  "Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Lebanon","Libya",
  "Malaysia","Mexico","Morocco","Nepal","Netherlands","New Zealand","Nigeria",
  "Norway","Oman","Pakistan","Palestine","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Saudi Arabia","Singapore","South Africa","South Korea",
  "Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Thailand",
  "Tunisia","Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Vietnam","Yemen","Zimbabwe",
];

export const NATIONALITIES = [
  "Afghan","Albanian","Algerian","Argentine","Australian","Austrian","Bahraini",
  "Bangladeshi","Belgian","Brazilian","Canadian","Chinese","Colombian","Croatian",
  "Cypriot","Czech","Danish","Egyptian","Ethiopian","Finnish","French","German",
  "Ghanaian","Greek","Hungarian","Indian","Indonesian","Iranian","Iraqi","Irish",
  "Israeli","Italian","Japanese","Jordanian","Kazakhstani","Kenyan","Kuwaiti",
  "Lebanese","Libyan","Malaysian","Mexican","Moroccan","Nepali","Dutch",
  "New Zealander","Nigerian","Norwegian","Omani","Pakistani","Palestinian",
  "Filipino","Polish","Portuguese","Qatari","Romanian","Russian","Saudi","Singaporean",
  "South African","South Korean","Spanish","Sri Lankan","Sudanese","Swedish",
  "Swiss","Syrian","Taiwanese","Thai","Tunisian","Turkish","Ugandan","Ukrainian",
  "Emirati","British","American","Vietnamese","Yemeni","Zimbabwean",
];

export const PHONE_CODES = [
  { code: "+971", country: "UAE", iso: "ae" },
  { code: "+966", country: "Saudi Arabia", iso: "sa" },
  { code: "+965", country: "Kuwait", iso: "kw" },
  { code: "+974", country: "Qatar", iso: "qa" },
  { code: "+973", country: "Bahrain", iso: "bh" },
  { code: "+968", country: "Oman", iso: "om" },
  { code: "+91",  country: "India", iso: "in" },
  { code: "+92",  country: "Pakistan", iso: "pk" },
  { code: "+880", country: "Bangladesh", iso: "bd" },
  { code: "+94",  country: "Sri Lanka", iso: "lk" },
  { code: "+977", country: "Nepal", iso: "np" },
  { code: "+86",  country: "China", iso: "cn" },
  { code: "+81",  country: "Japan", iso: "jp" },
  { code: "+82",  country: "South Korea", iso: "kr" },
  { code: "+65",  country: "Singapore", iso: "sg" },
  { code: "+60",  country: "Malaysia", iso: "my" },
  { code: "+62",  country: "Indonesia", iso: "id" },
  { code: "+63",  country: "Philippines", iso: "ph" },
  { code: "+66",  country: "Thailand", iso: "th" },
  { code: "+84",  country: "Vietnam", iso: "vn" },
  { code: "+90",  country: "Turkey", iso: "tr" },
  { code: "+20",  country: "Egypt", iso: "eg" },
  { code: "+212", country: "Morocco", iso: "ma" },
  { code: "+234", country: "Nigeria", iso: "ng" },
  { code: "+27",  country: "South Africa", iso: "za" },
  { code: "+254", country: "Kenya", iso: "ke" },
  { code: "+44",  country: "UK", iso: "gb" },
  { code: "+1",   country: "USA / Canada", iso: "us" },
  { code: "+61",  country: "Australia", iso: "au" },
  { code: "+49",  country: "Germany", iso: "de" },
  { code: "+33",  country: "France", iso: "fr" },
  { code: "+39",  country: "Italy", iso: "it" },
  { code: "+34",  country: "Spain", iso: "es" },
  { code: "+31",  country: "Netherlands", iso: "nl" },
  { code: "+7",   country: "Russia", iso: "ru" },
  { code: "+98",  country: "Iran", iso: "ir" },
  { code: "+964", country: "Iraq", iso: "iq" },
  { code: "+962", country: "Jordan", iso: "jo" },
  { code: "+961", country: "Lebanon", iso: "lb" },
  { code: "+967", country: "Yemen", iso: "ye" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract a numeric ticket ID from whatever shape the API returns
// Handles: number | string | { id: number } | { ticket_type: { id: number } }
// ─────────────────────────────────────────────────────────────────────────────
function resolveTicketId(editData) {
  if (!editData) return "";

  // Flat integer or numeric string on ticket_type_id
  if (editData.ticket_type_id != null) return String(editData.ticket_type_id);

  const tt = editData.ticket_type;

  // Nested object  { id: 3, ticket_name: "..." }
  if (tt != null && typeof tt === "object" && tt.id != null) return String(tt.id);

  // Plain integer / string ID
  if (tt != null && typeof tt !== "object") return String(tt);

  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: split "+971501234567" → { code: "+971", local: "501234567" }
// ─────────────────────────────────────────────────────────────────────────────
function splitPhone(fullNumber) {
  if (!fullNumber) return { matchedCode: PHONE_CODES[0], localNumber: "" };

  const found = [...PHONE_CODES]
    .sort((a, b) => b.code.length - a.code.length) // longest prefix first
    .find((p) => fullNumber.startsWith(p.code));

  if (found) {
    return { matchedCode: found, localNumber: fullNumber.slice(found.code.length) };
  }

  return { matchedCode: PHONE_CODES[0], localNumber: fullNumber };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateBadgeModal({ onClose, editData, onSuccess }) {

  const [selectedPhoneCode, setSelectedPhoneCode] = useState(PHONE_CODES[0]);
  const [tickets, setTickets]     = useState([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company_name: "",
    phone_number: "",
    ticket_type: "",
    nationality: "",
    country_of_residence: "",
    job_title: "",
  });

  const [consents, setConsents] = useState({
    terms: false,
    dataSharing: false,
    marketing: false,
  });

  const [errors, setErrors]         = useState({});
  const [formError, setFormError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── 1. Load tickets on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await TicketService.getTickets();
        setTickets(data.filter((t) => t.status === "active"));
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setTicketsLoaded(true);
      }
    })();
  }, []);

  // ── 2. Populate form once BOTH editData and tickets are ready ────────────
  useEffect(() => {
    // Only run for edit mode; wait until tickets have finished loading
    if (!editData || !ticketsLoaded) return;

    const ticketTypeId = resolveTicketId(editData);
    const { matchedCode, localNumber } = splitPhone(editData.phone_number || "");

    setSelectedPhoneCode(matchedCode);

    setFormData({
      first_name:           editData.first_name           || "",
      last_name:            editData.last_name            || "",
      email:                editData.email                || "",
      company_name:         editData.company_name         || "",
      phone_number:         localNumber,
      ticket_type:          ticketTypeId,
      nationality:          editData.nationality          || "",
      country_of_residence: editData.country_of_residence || "",
      job_title:            editData.job_title            || "",
    });

    setConsents({ terms: true, dataSharing: true, marketing: true });
  }, [editData, ticketsLoaded]);

  // ── Field change ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;

    const textOnlyFields = ["first_name", "last_name", "job_title", "company_name"];
    if (textOnlyFields.includes(name) && /\d/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleConsentChange = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
    if (errors[key]) {
      setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    const nameRegex = /^[a-zA-Z\s'\-]+$/;

    if (!formData.first_name.trim()) {
      errs.first_name = "First name is required.";
    } else if (!nameRegex.test(formData.first_name.trim())) {
      errs.first_name = "First name must contain letters only.";
    } else if (formData.first_name.trim().length < 2) {
      errs.first_name = "First name must be at least 2 characters.";
    }

    if (!formData.last_name.trim()) {
      errs.last_name = "Last name is required.";
    } else if (!nameRegex.test(formData.last_name.trim())) {
      errs.last_name = "Last name must contain letters only.";
    } else if (formData.last_name.trim().length < 2) {
      errs.last_name = "Last name must be at least 2 characters.";
    }

    if (!formData.job_title.trim()) {
      errs.job_title = "Job title is required.";
    } else if (formData.job_title.trim().length < 2) {
      errs.job_title = "Job title must be at least 2 characters.";
    } else if (formData.job_title.trim().length > 100) {
      errs.job_title = "Job title must be under 100 characters.";
    }

    if (!formData.company_name.trim()) {
      errs.company_name = "Company name is required.";
    } else if (formData.company_name.trim().length < 2) {
      errs.company_name = "Company name must be at least 2 characters.";
    } else if (formData.company_name.trim().length > 150) {
      errs.company_name = "Company name must be under 150 characters.";
    }

    if (!formData.country_of_residence)
      errs.country_of_residence = "Please select your country of residence.";

    if (!formData.nationality)
      errs.nationality = "Please select your nationality.";

    if (!formData.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Enter a valid email address.";
    }

    if (!formData.phone_number.trim()) {
      errs.phone_number = "Mobile number is required.";
    } else if (!/^\d{6,15}$/.test(formData.phone_number.trim())) {
      errs.phone_number = "Enter a valid mobile number (digits only, 6–15 digits).";
    }

    if (!formData.ticket_type) {
      errs.ticket_type = "Please select a ticket type.";
    } else {
      const selected = tickets.find((t) => String(t.id) === String(formData.ticket_type));
      if (selected && selected.available_count !== null && selected.available_count <= 0) {
        errs.ticket_type = `No badges available for "${selected.ticket_name}". Contact admin to allocate more.`;
      }
    }

    if (!consents.terms)
      errs.terms = "You must accept the Terms & Conditions and Privacy Policy to continue.";

    if (!consents.dataSharing)
      errs.dataSharing = "You must acknowledge this to continue.";

    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        phone_number: formData.phone_number
          ? `${selectedPhoneCode.code}${formData.phone_number}`
          : "",
        ticket_type: parseInt(formData.ticket_type, 10),
      };

      if (editData) {
        await BadgeService.updateBadge(editData.id, payload);
      } else {
        await BadgeService.createBadge(payload);
      }

      await Swal.fire({
        icon: "success",
        title: editData ? "Badge Updated" : "Badge Created",
        text: editData
          ? "Badge updated successfully."
          : "Badge created successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error(error);

      if (error && typeof error === "object" && !Array.isArray(error)) {
        const fieldErrors = {};
        let generic = "";

        Object.entries(error).forEach(([key, value]) => {
          const message = Array.isArray(value) ? value.join(" ") : String(value);
          if (key === "non_field_errors" || key === "detail") {
            generic = message;
          } else {
            fieldErrors[key] = message;
          }
        });

        if (Object.keys(fieldErrors).length > 0) setErrors((prev) => ({ ...prev, ...fieldErrors }));
        if (generic) {
          setFormError(generic);
        } else if (Object.keys(fieldErrors).length === 0) {
          setFormError("Something went wrong. Please try again.");
        }
      } else {
        setFormError(
          typeof error === "string" ? error : "Something went wrong. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived: currently selected ticket ───────────────────────────────────
  const selectedTicket = tickets.find((t) => String(t.id) === String(formData.ticket_type));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl rounded-lg overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-purple-700 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-10 border border-white rounded flex items-center justify-center text-xs">
              Logo
            </div>
            <div>
              <h2 className="font-bold text-xl">GULFOOD 2026</h2>
              <p className="text-sm text-purple-200">Jan 26, 2026 – Jan 30, 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="text-3xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-8">

          {formError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          {/* Show spinner while tickets are loading in edit mode */}
          {editData && !ticketsLoaded ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm gap-2">
              <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading registration details…
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">

                {/* First Name */}
                <div>
                  <label className="font-semibold">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.first_name ? "border-red-400" : ""}`}
                    placeholder="Enter your first name"
                  />
                  <FieldError message={errors.first_name} />
                </div>

                {/* Last Name */}
                <div>
                  <label className="font-semibold">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.last_name ? "border-red-400" : ""}`}
                    placeholder="Enter your last name"
                  />
                  <FieldError message={errors.last_name} />
                </div>

                {/* Job Title */}
                <div>
                  <label className="font-semibold">Job Title *</label>
                  <input
                    type="text"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.job_title ? "border-red-400" : ""}`}
                    placeholder="Enter your job title"
                  />
                  <FieldError message={errors.job_title} />
                </div>

                {/* Company Name */}
                <div>
                  <label className="font-semibold">Company Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.company_name ? "border-red-400" : ""}`}
                    placeholder="Enter your company name"
                  />
                  <FieldError message={errors.company_name} />
                </div>

                {/* Country of Residence */}
                <div>
                  <label className="font-semibold">Country of Residence *</label>
                  <select
                    name="country_of_residence"
                    value={formData.country_of_residence}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.country_of_residence ? "border-red-400" : ""}`}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <FieldError message={errors.country_of_residence} />
                </div>

                {/* Nationality */}
                <div>
                  <label className="font-semibold">Nationality *</label>
                  <select
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className={`w-full border rounded-md p-3 mt-2 ${errors.nationality ? "border-red-400" : ""}`}
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <FieldError message={errors.nationality} />
                </div>

                {/* Email */}
                <div>
                  <label className="font-semibold">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={!!editData}
                    className={`w-full border rounded-md p-3 mt-2 ${
                      editData ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                    } ${errors.email ? "border-red-400" : ""}`}
                    placeholder="Enter email"
                  />
                  <FieldError message={errors.email} />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="font-semibold">Mobile Number *</label>
                  <div className={`flex mt-2 rounded-md border overflow-hidden ${
                    errors.phone_number ? "border-red-400" : "border-gray-300"
                  }`}>
                    <div className="relative flex items-center bg-gray-50 border-r border-gray-300 shrink-0">
                      <span className={`fi fi-${selectedPhoneCode.iso} absolute left-3 text-lg pointer-events-none select-none rounded-sm`} />
                      <select
                        value={selectedPhoneCode.code}
                        onChange={(e) => {
                          const found = PHONE_CODES.find((p) => p.code === e.target.value);
                          if (found) setSelectedPhoneCode(found);
                        }}
                        className="appearance-none bg-transparent pl-10 pr-6 py-3 text-sm font-medium text-gray-700 outline-none cursor-pointer"
                      >
                        {PHONE_CODES.map((p) => (
                          <option key={p.code + p.iso} value={p.code}>
                            {p.code} ({p.country})
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-2 text-gray-400 pointer-events-none text-xs">▾</span>
                    </div>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setFormData((prev) => ({ ...prev, phone_number: val }));
                        if (errors.phone_number) {
                          setErrors((prev) => { const n = { ...prev }; delete n.phone_number; return n; });
                        }
                      }}
                      className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                      placeholder="50 000 0000"
                      maxLength={15}
                    />
                  </div>
                  <FieldError message={errors.phone_number} />
                </div>

                {/* Ticket Type */}
            <div>
              <label className="font-semibold">Ticket Type *</label>
                <select
                    name="ticket_type"
                    value={formData.ticket_type}
                    onChange={handleChange}
                    disabled={!!editData}
                    className={`w-full border rounded-md p-3 mt-2 ${
                      editData ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
                    } ${errors.ticket_type ? "border-red-400" : ""}`}
                  >
                        <option value="">Select Ticket Type</option>
                    {tickets.map((ticket) => {
                      const exhausted =
                        ticket.available_count !== null && ticket.available_count <= 0;
                      return (
                        <option
                          key={ticket.id}
                          value={String(ticket.id)}   // ← always a string for consistent comparison
                          disabled={exhausted}
                        >
                          {ticket.ticket_name}
                          {ticket.available_count !== null
                            ? exhausted
                              ? " — No badges available"
                              : ` (${ticket.available_count} available)`
                            : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Inline ticket availability warning */}
                  {!editData && selectedTicket && selectedTicket.available_count !== null && (
                      selectedTicket.available_count <= 0 ? (
                      <p className="text-red-500 text-xs mt-1">No badges available for this ticket type.</p>
                    ) : selectedTicket.available_count <= 5 ? (
                      <p className="text-amber-500 text-xs mt-1">
                        Only {selectedTicket.available_count} badge(s) remaining.
                      </p>
                    ) : null
                  )}

                  <FieldError message={errors.ticket_type} />
                </div>

              </div>

              {/* Checkboxes */}
              <div className="mt-8 space-y-4 text-sm text-gray-600">

                <div className={`p-3 rounded-lg border ${errors.terms ? "border-red-300 bg-red-50" : "border-transparent"}`}>
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={consents.terms}
                      onChange={() => handleConsentChange("terms")}
                      className="mt-0.5"
                    />
                    <span>
                      I confirm that I am 21 years of age or older, and I have read and agree to the{" "}
                      <a href="#" className="text-red-500 underline hover:text-red-600">Terms & Conditions</a>
                      {" "}and{" "}
                      <a href="#" className="text-red-500 underline hover:text-red-600">Privacy Policy</a>
                      . I understand that my personal data will be processed and, where necessary, shared
                      with contracted service providers, exhibitors, sponsors, and partners to deliver
                      event services, facilitate my participation, and manage follow-ups or communications
                      related to this event. *
                    </span>
                  </label>
                  <FieldError message={errors.terms} />
                </div>

                <div className={`p-3 rounded-lg border ${errors.dataSharing ? "border-red-300 bg-red-50" : "border-transparent"}`}>
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={consents.dataSharing}
                      onChange={() => handleConsentChange("dataSharing")}
                      className="mt-0.5"
                    />
                    <span>
                      I understand that if I allow an exhibitor or sponsor at the event to scan my badge,
                      whether physical or digital (e.g., via the Mobile App), I am providing them with my
                      personal data. I acknowledge that the organizers have no control over any
                      third-party use of this data and cannot be held liable for such use to the extent
                      permitted by law. *
                    </span>
                  </label>
                  <FieldError message={errors.dataSharing} />
                </div>

                <label className="flex gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={consents.marketing}
                    onChange={() => handleConsentChange("marketing")}
                    className="mt-0.5"
                  />
                  <span>
                    I consent to Kaoun International Limited and Dubai World Trade Centre, and where
                    necessary their contracted service providers, exhibitors, sponsors, and partners,
                    using my personal data for communications & marketing their products, services, and
                    future events. I understand that I can withdraw my consent at any time.
                  </span>
                </label>

              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-8 py-4 flex justify-end gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || (editData && !ticketsLoaded)}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-8 py-3 rounded transition"
          >
            {submitting ? "Saving…" : editData ? "UPDATE" : "REGISTER"}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded transition disabled:opacity-60"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
}