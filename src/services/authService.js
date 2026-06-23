import api from "../utils/axios";

class AuthService {

async login(username, password) {
    try {
        const response = await api.post("super-admin/login/", {
            username,
            password,
        });

        if (response.data.status) {

            localStorage.setItem(
                "access_token",
                response.data.access_token
            );

            localStorage.setItem(
                "refresh_token",
                response.data.refresh_token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );
        }

        return response.data;

    } catch (error) {

        return {
            status: false,
            message:
                error.response?.data?.message ||
                "Login failed",
        };
    }
}

logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");

}

getCurrentUser() {

    const user = localStorage.getItem("user");

    return user ? JSON.parse(user) : null;
}

isAuthenticated() {

    return !!localStorage.getItem(
        "access_token"
    );
}

getAccessToken() {

    return localStorage.getItem(
        "access_token"
    );
}

}

export default new AuthService();
