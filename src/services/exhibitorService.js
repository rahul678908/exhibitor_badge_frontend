import api from "../utils/axios";

class ExhibitorService {

    async getExhibitors() {
        try {

            const response = await api.get(
                "admin/exhibitors/"
            );

            return response.data;

        } catch (error) {

            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async getExhibitor(id) {
        try {

            const response = await api.get(
                `admin/exhibitors/${id}/`
            );

            return response.data;

        } catch (error) {

            throw (
                error.response?.data ||
                error.message
            );
        }
    }

    async createExhibitor(data) {
        try {

            const response = await api.post(
                "admin/exhibitors/create/",
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

    // async updateExhibitor(id, data) {
    //     try {

    //         const response = await api.put(
    //             `admin/exhibitors/${id}/update/`,
    //             data
    //         );

    //         return response.data;

    //     } catch (error) {

    //         throw (
    //             error.response?.data ||
    //             error.message
    //         );
    //     }
    // }

    // async deleteExhibitor(id) {
    //     try {

    //         const response = await api.delete(
    //             `admin/exhibitors/${id}/delete/`
    //         );

    //         return response.data;

    //     } catch (error) {

    //         throw (
    //             error.response?.data ||
    //             error.message
    //         );
    //     }
    // }

}

export default new ExhibitorService();