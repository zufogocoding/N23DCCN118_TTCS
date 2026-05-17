
import axios from "axios";

const API = "http://localhost:9000";

export const getUploadedSongs = async () => {
    try {
        const response = await axios.get(
            `${API}/api/songs/my-uploaded`,
            {
                headers:{
                    Authorization:`Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        return response.data;

    } catch(error){
        console.log(error);
        return [];
    }
};