import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// CORS options: allow any origin, keep credentials true for cookies
const corsOptions = {
  origin: true,             // Allow all origins
  credentials: true,        // Allow cookies and auth headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "Accept",
    "Origin",
    "X-Requested-With"
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

// Apply CORS middleware BEFORE other middleware and routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Middleware for parsing JSON, urlencoded, and cookies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Optional logging for debugging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.originalUrl} from ${req.get("Origin")}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// 404 handler for unknown API routes
app.use("/api/*", (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler including CORS violation response
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS policy violation" });
  }
  res.status(500).json({ message: "Internal server error" });
});

// Socket.IO configuration with permissive CORS
const io = new Server(server, {
  cors: {
    origin: true,           // Allow all origins for socket connections
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

// User socket tracking map
const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  const userSockets = userSocketMap.get(userId);
  if (!userSockets || userSockets.size === 0) return null;
  return Array.from(userSockets)[0]; // Return first active socket ID
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
    console.log(`📊 Online users: ${getOnlineUsers().length}`);

    // Join the user to a private room identified by userId
    socket.join(userId);

    // Emit the updated list of online users to all connected clients
    io.emit("getOnlineUsers", getOnlineUsers());
  } else {
    console.log("⚠️ Connection without valid userId");
  }

  // Handle user manually disconnecting
  socket.on("manual_disconnect", () => {
    console.log(`🔌 Manual disconnect from user ${userId}`);
    handleUserDisconnect(socket, userId);
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
    handleUserDisconnect(socket, userId);
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

function handleUserDisconnect(socket, userId) {
  if (userId && userSocketMap.has(userId)) {
    const userSockets = userSocketMap.get(userId);
    userSockets.delete(socket.id);

    if (userSockets.size === 0) {
      userSocketMap.delete(userId);
      console.log(`👋 User ${userId} fully disconnected`);
      console.log(`📊 Online users: ${getOnlineUsers().length}`);
    }
    // Always emit updated online users
    io.emit("getOnlineUsers", getOnlineUsers());
  }
}

io.engine.on("connection_error", (err) => {
  console.log(
    "❌ Socket.IO connection error:",
    err.req,
    err.code,
    err.message,
    err.context
  );
});

// Serve frontend build files in production mode
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// Start the backend server
server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  connectDB();
});

export { app, server, io };