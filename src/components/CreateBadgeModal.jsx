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

export default function CreateBadgeModal({
  onClose,
  editData,
  onSuccess,
}) {

  const [selectedPhoneCode, setSelectedPhoneCode] = useState(PHONE_CODES[0]); // defaults to 🇦🇪 +971

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

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    if (editData) {
      setFormData({
        first_name: editData.first_name || "",
        last_name: editData.last_name || "",
        email: editData.email || "",
        company_name: editData.company_name || "",
        phone_number: editData.phone_number || "",
        ticket_type: editData.ticket_type_id || "",
        nationality: editData.nationality || "",
        country_of_residence: editData.country_of_residence || "",
        job_title: editData.job_title || "",
      });
      // Editing an existing, already-submitted registration — treat consents as already given
      setConsents({ terms: true, dataSharing: true, marketing: true });
    }
  }, [editData]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await TicketService.getTickets();
      setTickets(data.filter((ticket) => ticket.status === "active"));
    } catch (error) {
      console.error("Failed to load tickets", error);
    }
  };

  // ── Clear a field's error as soon as the user edits it ──────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleConsentChange = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // ── Client-side validation ────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = "First name is required.";
    if (!formData.last_name.trim())  newErrors.last_name  = "Last name is required.";
    if (!formData.job_title.trim())  newErrors.job_title  = "Job title is required.";
    if (!formData.company_name.trim()) newErrors.company_name = "Company name is required.";

    if (!formData.country_of_residence) newErrors.country_of_residence = "Please select your country of residence.";
    if (!formData.nationality)          newErrors.nationality          = "Please select your nationality.";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Mobile number is required.";
    } else if (!/^\d{6,15}$/.test(formData.phone_number.trim())) {
      newErrors.phone_number = "Enter a valid mobile number.";
    }

    if (!formData.ticket_type) newErrors.ticket_type = "Please select a ticket type.";

    if (!consents.terms) {
      newErrors.terms = "You must accept the Terms & Conditions and Privacy Policy to continue.";
    }
    if (!consents.dataSharing) {
      newErrors.dataSharing = "You must acknowledge this to continue.";
    }

    return newErrors;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // ⛔ blocks submission until every required field/checkbox is valid
    }

    setErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
      phone_number: formData.phone_number
      ? `${selectedPhoneCode.code}${formData.phone_number}`   // e.g. "+97150000000"
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
        text: editData ? "Badge updated successfully." : "Badge created successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error(error);

      // DRF-style field errors look like: { "email": ["already exists."], "non_field_errors": [...] }
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

        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        if (generic) {
          setFormError(generic);
        } else if (Object.keys(fieldErrors).length === 0) {
          setFormError("Something went wrong. Please try again.");
        }
      } else {
        setFormError(typeof error === "string" ? error : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
              <p className="text-sm text-purple-200">Jan 26, 2026 - Jan 30, 2026</p>
            </div>

          </div>

          <button onClick={onClose} className="text-3xl leading-none">
            ×
          </button>

        </div>

        {/* Body */}

        <div className="max-h-[70vh] overflow-y-auto p-8">

          {formError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <label className="font-semibold">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`w-full border rounded-md p-3 mt-2 ${errors.first_name ? "border-red-400" : ""}`}
                placeholder="Enter your firstname"
              />
              <FieldError message={errors.first_name} />
            </div>

            <div>
              <label className="font-semibold">Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`w-full border rounded-md p-3 mt-2 ${errors.last_name ? "border-red-400" : ""}`}
                placeholder="Enter your lastname"
              />
              <FieldError message={errors.last_name} />
            </div>

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
              <div className={`flex mt-2 rounded-md border overflow-hidden ${errors.phone_number ? "border-red-400" : "border-gray-300"}`}>

                {/* Flag + dial code selector */}
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
                      <option key={p.code} value={p.code}>
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
                  onChange={handleChange}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                  placeholder="50 000 0000"
                />
              </div>
              <FieldError message={errors.phone_number} />
            </div>

            <div>
              <label className="font-semibold">Ticket Type *</label>
              <select
                name="ticket_type"
                value={formData.ticket_type}
                onChange={handleChange}
                className={`w-full border rounded-md p-3 mt-2 ${errors.ticket_type ? "border-red-400" : ""}`}
              >
                <option value="">Select Ticket Type</option>
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.ticket_name}
                  </option>
                ))}
              </select>
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
                  <a href="#" className="text-red-500 underline hover:text-red-600">
                    Terms & Conditions
                  </a>
                  {" "}and{" "}
                  <a href="#" className="text-red-500 underline hover:text-red-600">
                    Privacy Policy
                  </a>
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

        </div>

        {/* Footer */}

        <div className="bg-gray-100 px-8 py-4 flex justify-end gap-4">

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-8 py-3 rounded transition"
          >
            {submitting ? "Saving..." : editData ? "UPDATE" : "REGISTER"}
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