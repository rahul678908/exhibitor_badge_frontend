import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ReCAPTCHA from "react-google-recaptcha";
import { Building2, Lock, User } from "lucide-react";
import ExhibitorAuthService from "../services/exhibitorAuthService";

// ─── Field-level validation ───────────────────────────────────────────────────
const validateForm = ({ username, password }) => {
  const errors = {};
  if (!username.trim()) errors.username = "Username is required.";
  if (!password) errors.password = "Password is required.";
  return errors; // empty object = valid
};

const ExhibitorLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ 1. Frontend field validation before hitting the API
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // ✅ 1.5. Captcha required before submitting
    if (!captchaToken) {
      Swal.fire({
        icon: "warning",
        title: "Captcha Required",
        text: "Please complete the captcha before logging in.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await ExhibitorAuthService.login(
        formData.username.trim(),
        formData.password,
        captchaToken
      );

      // ✅ 2. Successful login — token present
      if (response?.access) {
        await Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: "Welcome to your Exhibitor Portal",
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/exhibitor-dashboard");
        return;
      }

      // ✅ 3. API returned a structured error (non-exhibitor, wrong credentials, etc.)
      const message =
        response?.message ||
        response?.detail ||
        "Login failed. Please check your credentials.";

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: message,
      });

      recaptchaRef.current?.reset();
      setCaptchaToken(null);

    } catch (error) {
      // ✅ 4. Network error or unexpected API failure
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Something went wrong. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: message,
      });

      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8">

        {/* Back button */}
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Building2 size={60} className="mx-auto text-green-600" />
          <h2 className="text-3xl font-bold mt-4">Exhibitor Login</h2>
          <p className="text-slate-500">Access your exhibitor portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Username */}
          <div>
            <label className="block mb-2 text-sm font-medium">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-green-500 outline-none transition ${
                  fieldErrors.username ? "border-red-400 focus:ring-red-400" : "border-slate-200"
                }`}
                placeholder="Enter your username"
              />
            </div>
            {fieldErrors.username && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-sm font-medium">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-green-500 outline-none transition ${
                  fieldErrors.password ? "border-red-400 focus:ring-red-400" : "border-slate-200"
                }`}
                placeholder="Enter your password"
              />
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Captcha */}
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptchaToken(token)}
            onExpired={() => setCaptchaToken(null)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition"
          >
            {loading ? "Logging in…" : "Login"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default ExhibitorLogin;