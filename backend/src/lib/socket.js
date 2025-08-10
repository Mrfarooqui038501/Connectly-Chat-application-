import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// MUST include "https://" in production for Netlify!
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://connectyly-chat-application.netlify.app"]
    : ["http://localhost:5173", "http://localhost:3000"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// User socket map logic (unchanged)
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId) || new Set();
}

function getOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    io.emit("getOnlineUsers", getOnlineUsers());
  }

  socket.on("disconnect", () => {
    if (userId && userSocketMap.has(userId)) {
      const userSockets = userSocketMap.get(userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        userSocketMap.delete(userId);
      }
      io.emit("getOnlineUsers", getOnlineUsers());
    }
  });
});

export { io, app, server };
