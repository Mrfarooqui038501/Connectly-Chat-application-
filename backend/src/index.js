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

// MUST include full frontend Netlify URLs (with https://)
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

// Dynamic origin function for best CORS+credentials security
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
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
  optionsSuccessStatus: 200
}));

app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "Cookie",
    "Accept",
    "Origin",
    "X-Requested-With"
  ]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  console.error("Stack:", err.stack);
  if (err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      message: "CORS policy violation",
      error: process.env.NODE_ENV === "development" ? err.message : "Access denied"
    });
  }
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

app.use("/api/*", (req, res) => {
  res.status(404).json({ 
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔒 CORS allowed for: ${allowedOrigins.join(", ")}`);
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
process.on("unhandledRejection", (err, promise) => {
  console.log("❌ Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});
process.on("uncaughtException", (err) => {
  console.log("❌ Uncaught Exception:", err.message);
  server.close(() => process.exit(1));
});
