import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/resume';

export const downloadPdf = async (resumeData) => {
    const response = await axios.post(`${BASE_URL}/download`, resumeData, {
        responseType: 'blob', // Critical for handling the file download
    });
    return response.data;
};

export const uploadPdf = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};