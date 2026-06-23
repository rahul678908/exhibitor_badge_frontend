import { useNavigate } from "react-router-dom";
import { ShieldCheck, Building2 } from "lucide-react";

const LoginSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

      <div className="max-w-4xl w-full">

        <div className="text-center mb-10">

          <h1 className="text-4xl font-bold text-slate-800">
            Badge Management Portal
          </h1>

          <p className="text-slate-500 mt-2">
            Select your login type
          </p>

        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* Admin Login */}

          <div
            onClick={() => navigate("/login")}
            className="
              bg-white
              rounded-2xl
              shadow-lg
              p-8
              cursor-pointer
              hover:shadow-xl
              hover:-translate-y-1
              transition-all
            "
          >

            <div className="flex justify-center mb-5">
              <ShieldCheck
                size={60}
                className="text-blue-600"
              />
            </div>

            <h2 className="text-2xl font-semibold text-center mb-3">
              Admin Login
            </h2>

            <p className="text-slate-500 text-center">
              Manage exhibitors, tickets,
              badge allocations and portal settings.
            </p>

          </div>

          {/* Exhibitor Login */}

          <div
            onClick={() =>
              navigate("/exhibitor-login")
            }
            className="
              bg-white
              rounded-2xl
              shadow-lg
              p-8
              cursor-pointer
              hover:shadow-xl
              hover:-translate-y-1
              transition-all
            "
          >

            <div className="flex justify-center mb-5">
              <Building2
                size={60}
                className="text-green-600"
              />
            </div>

            <h2 className="text-2xl font-semibold text-center mb-3">
              Exhibitor Login
            </h2>

            <p className="text-slate-500 text-center">
              Create badges, upload attendees,
              manage invitations and registrations.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default LoginSelection;