import api from "../utils/axios";

class BadgeService {

    async createBadge(data) {
        try {
            const response = await api.post("registrations/create/", data);
            return response.data;
        } catch (error) {
            throw (error.response?.data || error.message);
        }
    }

    // ── Fetches ALL pages and returns one flat array ───────────────
async getRegistrations() {
    try {
        const response = await api.get("exhibitor/registrations/");
        return response.data; // already a flat array now
    } catch (error) {
        throw (error.response?.data || error.message);
    }
}

    async getBadge(id) {
        try {
            const response = await api.get(`registrations/${id}/`);
            return response.data;
        } catch (error) {
            throw (error.response?.data || error.message);
        }
    }

    async updateBadge(id, data) {
        try {
            const response = await api.put(`registrations/${id}/update/`, data);
            return response.data;
        } catch (error) {
            throw (error.response?.data || error.message);
        }
    }

    async deleteBadge(id) {
        try {
            const response = await api.delete(`registrations/${id}/delete/`);
            return response.data;
        } catch (error) {
            throw (error.response?.data || error.message);
        }
    }
}

export default new BadgeService();