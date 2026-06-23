import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import {
  Building2,
  Lock,
  User,
} from "lucide-react";

import ExhibitorAuthService from "../services/exhibitorAuthService";

const ExhibitorLogin = () => {

  const navigate = useNavigate();

  const [formData, setFormData] =
    useState({
      username: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);

    const response =
      await ExhibitorAuthService.login(
        formData.username,
        formData.password
      );

    setLoading(false);

    if (
      response.access
    ) {

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text:
          "Welcome Exhibitor",
      });

      navigate(
        "/exhibitor-dashboard"
      );

    } else {

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text:
          response.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8">

        <div className="flex justify-start mb-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="
            px-3
            py-2
            border
            border-green-600
            text-green-600
            rounded-lg
            hover:bg-green-600
            hover:text-white
            transition
            text-sm
            font-medium
          "
        >
          ← Back
        </button>
      </div>
      
        <div className="text-center mb-8">

          <Building2
            size={60}
            className="mx-auto text-green-600"
          />

          <h2 className="text-3xl font-bold mt-4">
            Exhibitor Login
          </h2>

          <p className="text-slate-500">
            Access your exhibitor portal
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>

            <label className="block mb-2 text-sm font-medium">
              Username
            </label>

            <div className="relative">

              <User
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="text"
                name="username"
                value={
                  formData.username
                }
                onChange={
                  handleChange
                }
                className="
                  w-full
                  border
                  rounded-lg
                  pl-10
                  pr-4
                  py-3
                  focus:ring-2
                  focus:ring-green-500
                  outline-none
                "
                placeholder="Username"
                required
              />

            </div>

          </div>

          <div>

            <label className="block mb-2 text-sm font-medium">
              Password
            </label>

            <div className="relative">

              <Lock
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="password"
                name="password"
                value={
                  formData.password
                }
                onChange={
                  handleChange
                }
                className="
                  w-full
                  border
                  rounded-lg
                  pl-10
                  pr-4
                  py-3
                  focus:ring-2
                  focus:ring-green-500
                  outline-none
                "
                placeholder="Password"
                required
              />

            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              bg-green-600
              hover:bg-green-700
              text-white
              py-3
              rounded-lg
              font-medium
            "
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

      </div>

    </div>
  );
};

export default ExhibitorLogin;