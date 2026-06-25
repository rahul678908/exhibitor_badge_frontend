import api from "../utils/axios";

class TicketService {

    async getTickets() {
        try {
            const response = await api.get(
                "admin/tickets/"
            );

            return response.data;

        } catch (error) {
            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async getMyAllocations() {
    try {
        const response = await api.get("exhibitor/my-allocations/");
        return response.data;
    } catch (error) {
        throw (error.response?.data || error.message);
    }
}

    async getTicket(id) {
        try {
            const response = await api.get(
                `admin/tickets/${id}/`
            );

            return response.data;

        } catch (error) {
            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async createTicket(data) {
        try {
            const response = await api.post(
                "admin/tickets/create/",
                data
            );

            return response.data;

        } catch (error) {
            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async updateTicket(id, data) {
        try {
            const response = await api.put(
                `admin/tickets/${id}/update/`,
                data
            );

            return response.data;

        } catch (error) {
            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async deleteTicket(id) {
        try {
            const response = await api.delete(
                `admin/tickets/${id}/delete/`
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

export default new TicketService();