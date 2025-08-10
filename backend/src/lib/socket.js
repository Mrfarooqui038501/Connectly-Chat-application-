import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// CORS configuration for Socket.IO - Must match your frontend domain
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://connectyly-chat-application.netlify.app",
      "https://connectly-chat-application.netlify.app" // Add both variants
    ]
  : [
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://127.0.0.1:5173"
    ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  },
  allowEIO3: true, // Enable Engine.IO v3 compatibility
  transports: ["websocket", "polling"], // Allow both transport methods
  pingTimeout: 60000, // Timeout before closing connection
  pingInterval: 25000 // Interval between ping packets
});

// User socket map for tracking online users
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId) || new Set();
}

function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== "undefined") {
    // Add user to online users map
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    
    console.log(`👤 User ${userId} connected with socket ${socket.id}`);
    
    // Emit updated online users list
    io.emit("getOnlineUsers", getOnlineUsers());
    
    // Join user to their own room for private messages
    socket.join(userId);
  } else {
    console.log("⚠️ Connection without valid userId");
  }

  // Handle user disconnection
  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
    
    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      
      // Remove user from map if no more sockets
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
        console.log(`👋 User ${userId} fully disconnected`);
      }
      
      // Emit updated online users list
      io.emit("getOnlineUsers", getOnlineUsers());
    }
  });

  // Handle connection errors
  socket.on("connect_error", (error) => {
    console.log("❌ Socket connection error:", error.message);
  });

  // Handle custom events (you can add more as needed)
  socket.on("typing", (data) => {
    socket.broadcast.to(data.receiverId).emit("typing", {
      senderId: userId,
      isTyping: data.isTyping
    });
  });
});

// Log server events
io.on("connect_error", (error) => {
  console.log("❌ Socket.IO connection error:", error);
});

export { io, app, server };