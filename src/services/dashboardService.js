import api from "../utils/axios";

class DashboardService {

    async getDashboardData() {

        try {

            const response = await api.get(
                "exhibitor/dashboard/"
            );

            return response.data;

        } catch (error) {

            throw (
                error.response?.data ||
                error.message
            );
        }
    }
}

export default new DashboardService();