import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Allowed origins for CORS including full https URL for Netlify frontend
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://connectyly-chat-application.netlify.app"] // Full URL including https://
    : ["http://localhost:5173", "http://localhost:3000"];

// Dynamic CORS origin checker to allow only allowed origins and handle no-origin requests like Postman
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow no-origin requests like Postman
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

// 404 handler for APIs
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌍 CORS allowed for: ${allowedOrigins.join(", ")}`);
  console.log(`📝 API available at: http://localhost:${PORT}/api`);
  connectDB();
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("💀 Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("💀 Process terminated");
  });
});
