import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : "https://connectly-chat-application.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
      get().disconnectSocket();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      // First disconnect socket before making logout request
      const socket = get().socket;
      if (socket) {
        socket.emit("manual_disconnect");
        socket.disconnect();
      }

      // Make logout request to backend
      await axiosInstance.post("/auth/logout");
      
      // Clear local state
      set({ authUser: null, onlineUsers: [], socket: null });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if request fails
      const socket = get().socket;
      if (socket) {
        socket.disconnect();
      }
      set({ authUser: null, onlineUsers: [], socket: null });
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) {
      console.log("No auth user, cannot connect socket");
      return;
    }

    // Disconnect existing socket if any
    if (socket) {
      console.log("Disconnecting existing socket");
      socket.off();
      socket.disconnect();
    }

    console.log("Connecting to socket with backend URL:", backendURL);
    console.log("User ID:", authUser._id);

    const newSocket = io(backendURL, {
      query: { userId: authUser._id },
      withCredentials: true,
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected successfully:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      console.error("Error details:", err);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      console.log("📊 Received online users:", userIds);
      const filteredUsers = userIds.filter((id) => id !== authUser._id);
      console.log("📊 Filtered online users (excluding self):", filteredUsers);
      set({ onlineUsers: filteredUsers });
    });

    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      console.log("🔌 Disconnecting socket");
      socket.off();
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error in updateProfile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));