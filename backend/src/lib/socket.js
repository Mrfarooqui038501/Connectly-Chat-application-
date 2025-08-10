import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// CORS with full Netlify URLs + variants
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://connectly-chat-application-1.netlify.app",
      "https://connectly-chat-application.netlify.app"
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
  allowEIO3: true,
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// User socket map for online status
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId) || new Set();
}

function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId && userId !== "undefined") {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    io.emit("getOnlineUsers", getOnlineUsers());
    socket.join(userId);
  }

  socket.on("disconnect", (reason) => {
    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
      }
      io.emit("getOnlineUsers", getOnlineUsers());
    }
  });

  socket.on("connect_error", (error) => {
    console.log("❌ Socket connection error:", error.message);
  });

  socket.on("typing", (data) => {
    socket.broadcast.to(data.receiverId).emit("typing", {
      senderId: userId,
      isTyping: data.isTyping
    });
  });
});

io.on("connect_error", (error) => {
  console.log("❌ Socket.IO connection error:", error);
});

export { io, app, server };
