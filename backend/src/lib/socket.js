import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://connectly-chat-application-1.netlify.app"]
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
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  },
  allowEIO3: true,
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  const userSockets = userSocketMap.get(userId);
  if (!userSockets || userSockets.size === 0) return null;
  return Array.from(userSockets)[0]; // return first active socket
}

function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    console.log(`👤 User ${userId} connected with socket ${socket.id}`);

    // Join the user to their own private room
    socket.join(userId);

    // Emit the updated list of online users
    io.emit("getOnlineUsers", getOnlineUsers());
  } else {
    console.log("⚠️ Connection without valid userId");
  }

  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);

    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
        console.log(`👋 User ${userId} fully disconnected`);
      }
      io.emit("getOnlineUsers", getOnlineUsers());
    }
  });

  socket.on("connect_error", (error) => {
    console.log("❌ Socket connection error:", error.message);
  });

  socket.on("typing", (data) => {
    const receiverSocketId = getReceiverSocketId(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        senderId: userId,
        isTyping: data.isTyping,
      });
    }
  });
});

io.engine.on("connection_error", (err) => {
  console.log("❌ Socket.IO connection error:", err.req, err.code, err.message, err.context);
});

export { io, app, server };
