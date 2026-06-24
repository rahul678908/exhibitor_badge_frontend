import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaCheckCircle, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const COUNTRIES = [
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

const NATIONALITIES = [
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

const PHONE_CODES = [
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

export default function RegisterPage() {
  const { token } = useParams();

  const [errors, setErrors]                       = useState({});
  const [loading, setLoading]                     = useState(true);
  const [submitting, setSubmitting]               = useState(false);
  const [nameSaving, setNameSaving]               = useState(false);
  const [error, setError]                         = useState(null);
  const [done, setDone]                           = useState(false);
  const [urn, setUrn]                             = useState("");
  const [info, setInfo]                           = useState(null);
  const [editingName, setEditingName]             = useState(false);
  const [nameEdit, setNameEdit]                   = useState({ first_name: "", last_name: "" });
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(PHONE_CODES[0]);

  const [form, setForm] = useState({
    job_title: "",
    company_name: "",
    phone_number: "",
    country_of_residence: "",
    nationality: "",
    terms_accepted: false,
  });

  // ── Load invitation details ──
  useEffect(() => {
    publicApi
      .get(`register/${token}/`)
      .then((res) => {
        setInfo(res.data);
        setNameEdit({ first_name: res.data.first_name, last_name: res.data.last_name });
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.error ||
            "This invitation link is invalid or has already been used."
        );
        setLoading(false);
      });
  }, [token]);

  // ── Save edited name via PUT ──
  const handleSaveName = async () => {
    if (!nameEdit.first_name.trim() || !nameEdit.last_name.trim()) return;

    setNameSaving(true);
    try {
      await publicApi.put(`register/${token}/update-name/`, {
        first_name: nameEdit.first_name,
        last_name:  nameEdit.last_name,
      });
      setInfo((prev) => ({
        ...prev,
        first_name: nameEdit.first_name,
        last_name:  nameEdit.last_name,
      }));
      setEditingName(false);
    } catch (err) {
      console.error("Failed to update name", err);
    } finally {
      setNameSaving(false);
    }
  };

  // ── Form field change + clear error ──
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── Validation ──
  const validate = () => {
    const errs = {};
    if (!form.job_title.trim())        errs.job_title            = "Job title is required.";
    if (!form.company_name.trim())     errs.company_name         = "Company name is required.";
    if (!form.nationality)             errs.nationality          = "Please select your nationality.";
    if (!form.country_of_residence)    errs.country_of_residence = "Please select your country of residence.";
    if (!form.phone_number.trim()) {
      errs.phone_number = "Mobile number is required.";
    } else if (!/^\d{6,15}$/.test(form.phone_number.trim())) {
      errs.phone_number = "Enter a valid mobile number (digits only).";
    }
    if (!form.terms_accepted) {
      errs.terms_accepted = "You must accept the terms and conditions.";
    }
    return errs;
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        phone_number: `${selectedPhoneCode.code}${form.phone_number}`,
      };
      const res = await publicApi.post(`register/${token}/complete/`, payload);
      setUrn(res.data.urn);
      setDone(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FaSpinner className="animate-spin text-purple-700 text-4xl" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <FaExclamationTriangle className="text-red-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Registration Complete!</h2>
          <p className="text-gray-500 mb-4">
            Welcome, <strong>{info?.first_name} {info?.last_name}</strong>
          </p>
          <div
            className="rounded-xl px-6 py-4 text-white text-center"
            style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
          >
            <p className="text-sm opacity-80 mb-1">Your Registration Number</p>
            <p className="text-3xl font-bold tracking-wider">{urn}</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Please save your registration number for event entry.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl overflow-hidden">

        {/* Header */}
        <div
          className="px-8 py-6 text-white"
          style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
        >
          <h1 className="text-2xl font-bold">Complete Your Registration</h1>
          <p className="text-white/70 text-sm mt-1">You've been invited to GULFOOD 2026</p>
        </div>

        {/* Pre-filled Info */}
        <div className="px-8 py-5 bg-purple-50 border-b">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-3">
            Invitation Details
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">

            {/* Name — inline editable via PUT */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-gray-400">Name</span>
                {!editingName && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="text-purple-400 hover:text-purple-700 transition"
                    title="Edit name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
              </div>

              {editingName ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={nameEdit.first_name}
                      onChange={(e) => setNameEdit((p) => ({ ...p, first_name: e.target.value }))}
                      placeholder="First"
                      className="w-1/2 border border-purple-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <input
                      value={nameEdit.last_name}
                      onChange={(e) => setNameEdit((p) => ({ ...p, last_name: e.target.value }))}
                      placeholder="Last"
                      className="w-1/2 border border-purple-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="self-start bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    {nameSaving
                      ? <FaSpinner className="animate-spin w-3 h-3" />
                      : <FaCheckCircle className="w-3 h-3" />
                    }
                    {nameSaving ? "Saving..." : "Done"}
                  </button>
                </div>
              ) : (
                <p className="font-semibold text-gray-800">
                  {info.first_name} {info.last_name}
                </p>
              )}
            </div>

            <div>
              <span className="text-gray-400">Email</span>
              <p className="font-semibold text-gray-800">{info.email}</p>
            </div>
            <div>
              <span className="text-gray-400">Ticket Type</span>
              <p className="font-semibold text-gray-800">{info.ticket_type}</p>
            </div>

          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">
            Please fill in the remaining details:
          </p>

          <div className="grid grid-cols-2 gap-4">

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Job Title *</label>
              <input
                type="text"
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g. Manager"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.job_title ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.job_title && <p className="text-xs text-red-500 mt-1">{errors.job_title}</p>}
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Company Name *</label>
              <input
                type="text"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="e.g. ABC Corp"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.company_name ? "border-red-400" : "border-gray-300"
                }`}
              />
              {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nationality *</label>
              <select
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.nationality ? "border-red-400" : "border-gray-300"
                }`}
              >
                <option value="">Select nationality</option>
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {errors.nationality && <p className="text-xs text-red-500 mt-1">{errors.nationality}</p>}
            </div>

            {/* Country of Residence */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Country of Residence *</label>
              <select
                name="country_of_residence"
                value={form.country_of_residence}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.country_of_residence ? "border-red-400" : "border-gray-300"
                }`}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.country_of_residence && <p className="text-xs text-red-500 mt-1">{errors.country_of_residence}</p>}
            </div>

            {/* Mobile Number */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Number *</label>
              <div className={`flex rounded-lg border overflow-hidden ${
                errors.phone_number ? "border-red-400" : "border-gray-300"
              }`}>

                {/* Flag + dial code */}
                <div className="relative flex items-center bg-gray-50 border-r border-gray-300 shrink-0">
                  <span className={`fi fi-${selectedPhoneCode.iso} absolute left-3 text-lg pointer-events-none select-none rounded-sm`} />
                  <select
                    value={selectedPhoneCode.code}
                    onChange={(e) => {
                      const found = PHONE_CODES.find((p) => p.code === e.target.value);
                      if (found) setSelectedPhoneCode(found);
                    }}
                    className="appearance-none bg-transparent pl-10 pr-6 py-2.5 text-sm font-medium text-gray-700 outline-none cursor-pointer"
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
                  value={form.phone_number}
                  onChange={handleChange}
                  placeholder="50 000 0000"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                />
              </div>
              {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
            </div>

          </div>

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer mt-2">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={form.terms_accepted}
                onChange={handleChange}
                className="mt-1 accent-purple-700"
              />
              <span className="text-sm text-gray-500">
                I agree to the{" "}
                <span className="text-purple-700 font-medium underline cursor-pointer">
                  Terms and Conditions
                </span>{" "}
                of GULFOOD 2026.
              </span>
            </label>
            {errors.terms_accepted && (
              <p className="text-xs text-red-500 mt-1 ml-6">{errors.terms_accepted}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition mt-2"
            style={{ background: "linear-gradient(135deg, #3f0e60, #891487)" }}
          >
            {submitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
            {submitting ? "Submitting..." : "Complete Registration"}
          </button>
        </form>

      </div>
    </div>
  );
}