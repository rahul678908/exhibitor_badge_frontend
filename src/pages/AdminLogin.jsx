import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import AuthService from "../services/authService";

const Login = () => {

const [loading, setLoading] =
    useState(false);

const [formData, setFormData] =
    useState({
        username: "",
        password: "",
    });

const [captchaToken, setCaptchaToken] =
    useState(null);

const recaptchaRef = useRef(null);

const handleChange = (e) => {

    setFormData({
        ...formData,
        [e.target.name]:
            e.target.value,
    });
};

const handleSubmit = async (e) => {

    e.preventDefault();

    if (!captchaToken) {
        alert("Please complete the captcha.");
        return;
    }

    setLoading(true);

    const response =
        await AuthService.login(
            formData.username,
            formData.password,
            captchaToken
        );

    setLoading(false);

    if (response.status) {

        alert(
            response.message
        );

        window.location.href =
            "/admin-dashboard";

    } else {

        alert(
            response.message
        );

        // Tokens are single-use — reset so they can retry
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
    }
};

return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">

            <Link
                to="/"
                className="inline-flex items-center text-purple-700 hover:text-purple-900 mb-4 font-medium"
            >
                ← Back
            </Link>

            <h2 className="text-3xl font-bold text-center mb-6">
                Admin Login
            </h2>

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={
                        formData.username
                    }
                    onChange={
                        handleChange
                    }
                    className="w-full border rounded-lg px-4 py-3"
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={
                        formData.password
                    }
                    onChange={
                        handleChange
                    }
                    className="w-full border rounded-lg px-4 py-3"
                    required
                />

                <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={(token) => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-700 text-white py-3 rounded-lg hover:bg-purple-800"
                >
                    {
                        loading
                            ? "Logging In..."
                            : "Login"
                    }
                </button>

            </form>

        </div>

    </div>
);

};

export default Login;