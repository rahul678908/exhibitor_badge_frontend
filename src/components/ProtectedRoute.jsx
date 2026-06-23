import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({
  tokenKey = "access_token",
  redirectTo = "/"
}) => {
    const token = localStorage.getItem(tokenKey);

    return token
        ? <Outlet />
        : <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;