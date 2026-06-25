import api from "../utils/axios";

class ExhibitorAuthService {

  async login(username, password) {

    try {

      const response = await api.post(
        "exhibitor/login/",
        {
          username,
          password,
        }
      );

      if (response.data.access) {

        localStorage.setItem(
          "exhibitor_access_token",
          response.data.access
        );

        localStorage.setItem(
          "exhibitor_refresh_token",
          response.data.refresh
        );
      }

      return response.data;

    } catch (error) {

      return {
        status: false,
        message:
          error.response?.data?.message ||  // ✅ your backend uses "message" not "detail"
          error.response?.data?.detail ||
          "Login failed",
      };
    }
  }

  logout() {

    localStorage.removeItem(
      "exhibitor_access_token"
    );

    localStorage.removeItem(
      "exhibitor_refresh_token"
    );
  }
}

export default new ExhibitorAuthService();