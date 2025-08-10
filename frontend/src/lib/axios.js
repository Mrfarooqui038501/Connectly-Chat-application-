export const axiosInstance = axios.create({
  baseURL: "https://connectly-chat-application.onrender.com/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});