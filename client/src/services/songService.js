
import { api } from "../utils/api";

export const getUploadedSongs = async () => {
    try {
        const response = await api.get('/api/songs/my-uploaded');
        return await response.json();
    } catch(error){
        console.error(error);
        return [];
    }
};