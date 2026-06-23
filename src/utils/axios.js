  import axios from "axios";

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  api.interceptors.request.use(
    (config) => {

      // ✅ Check for exhibitor token first, fall back to admin token
      const token =
        localStorage.getItem("exhibitor_access_token") ||
        localStorage.getItem("access_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {

      if (error.response && error.response.status === 401) {

        // ✅ Redirect to the correct login page based on which token was in use
        const isExhibitor = localStorage.getItem("exhibitor_access_token");

        localStorage.clear();

        window.location.href = isExhibitor
          ? "/exhibitor-login"
          : "/login";
      }

      return Promise.reject(error);
    }
  );

  export default api;