import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = new Server(server, {
  cors: {
    origin: [
      "https://connectly-chat-application-1.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    transports: ["websocket", "polling"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

// User socket tracking
const userSocketMap = new Map(); // userId -> Set(socketIds)

// Helper functions
const getReceiverSocketId = (userId) => {
  const sockets = userSocketMap.get(userId);
  return sockets ? Array.from(sockets)[0] : null;
};

const getOnlineUsers = () => Array.from(userSocketMap.keys());

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== "undefined") {
    // Add user to tracking map
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    
    // Notify all clients about online users
    io.emit("getOnlineUsers", getOnlineUsers());
    
    // Join user to their private room
    socket.join(userId);
  }

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
      }
      
      io.emit("getOnlineUsers", getOnlineUsers());
    }
  });

  // Error handling
  socket.on("error", (error) => {
    console.log("Socket error:", error);
  });
});

// Handle server errors
io.engine.on("connection_error", (err) => {
  console.log("Socket.IO connection error:", {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

export { io, app, server };
export { getReceiverSocketId };