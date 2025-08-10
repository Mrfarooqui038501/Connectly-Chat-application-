import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:5001/api'
    : 'https://connectly-chat-application.onrender.com/api',
  withCredentials: true, // IMPORTANT: for sending cookies cross-origin
});
