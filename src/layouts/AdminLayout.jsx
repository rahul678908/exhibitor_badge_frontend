import Sidebar from "../pages/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="flex bg-gray-100 min-h-screen">

      <Sidebar />

      <main className="flex-1 p-6">

        <div className="bg-white rounded-xl shadow-sm p-6 min-h-[95vh]">

          <Outlet />

        </div>

      </main>

    </div>
  );
};

export default AdminLayout;