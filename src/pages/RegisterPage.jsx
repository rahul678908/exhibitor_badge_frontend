import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaCheckCircle, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export default function RegisterPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [urn, setUrn] = useState("");

  const [info, setInfo] = useState(null); // prefilled from invitation
  const [form, setForm] = useState({
    job_title: "",
    company_name: "",
    phone_number: "",
    country_of_residence: "",
    nationality: "",
    terms_accepted: false,
  });

  // Load invitation details
  useEffect(() => {
    publicApi
      .get(`register/${token}/`)
      .then((res) => {
        setInfo(res.data);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const errs = {};

    if (form.phone_number && !/^\+?[\d\s\-().]{7,15}$/.test(form.phone_number)) {
      errs.phone_number = "Enter a valid phone number.";
    }

    if (form.job_title && form.job_title.length > 100) {
      errs.job_title = "Job title must be under 100 characters.";
    }

    if (form.company_name && form.company_name.length > 150) {
      errs.company_name = "Company name must be under 150 characters.";
    }

    if (!form.terms_accepted) {
      errs.terms_accepted = "You must accept the terms and conditions.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const res = await publicApi.post(`register/${token}/complete/`, form);
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Invalid Invitation
          </h2>
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Registration Complete!
          </h2>
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
          <p className="text-white/70 text-sm mt-1">
            You've been invited to GULFOOD 2026
          </p>
        </div>

        {/* Pre-filled Info */}
        <div className="px-8 py-5 bg-purple-50 border-b">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-3">
            Invitation Details
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Name</span>
              <p className="font-semibold text-gray-800">
                {info.first_name} {info.last_name}
              </p>
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
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Job Title</label>
              <input
                type="text"
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g. Manager"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.job_title ? "border-red-400" : ""
                }`}
              />
              {errors.job_title && <p className="text-xs text-red-500 mt-1">{errors.job_title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="e.g. ABC Corp"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.company_name ? "border-red-400" : ""
                }`}
              />
              {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="+971 50 000 0000"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 ${
                  errors.phone_number ? "border-red-400" : ""
                }`}
              />
              {errors.phone_number && <p className="text-xs text-red-500 mt-1">{errors.phone_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nationality</label>
              <input
                type="text"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                placeholder="e.g. Emirati"
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Country of Residence</label>
              <input
                type="text"
                name="country_of_residence"
                value={form.country_of_residence}
                onChange={handleChange}
                placeholder="e.g. United Arab Emirates"
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
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
            {submitting ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaCheckCircle />
            )}
            {submitting ? "Submitting..." : "Complete Registration"}
          </button>
        </form>

      </div>
    </div>
  );
}