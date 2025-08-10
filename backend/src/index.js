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

// ======================
// ✅ CORS Configuration
// ======================
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://connectly-chat-application-1.netlify.app"]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
      ];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests without Origin (Postman, mobile apps)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Needed for cookies
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
  optionsSuccessStatus: 204
};

// Must be before your routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle all OPTIONS preflight

// ======================
// ✅ Body Parsing & Cookies
// ======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Debugging middleware (optional)
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.originalUrl} from ${req.get("Origin")}`);
  next();
});

// ======================
// ✅ Health Check
// ======================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ======================
// ✅ API Routes
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ======================
// ❌ 404 for unknown API routes
// ======================
app.use("/api/*", (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method
  });
});

// ======================
// ❌ Error Handler
// ======================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS policy violation" });
  }

  res.status(500).json({
    message: "Internal server error"
  });
});

// ======================
// Serve frontend in production
// ======================
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ======================
// 🚀 Start Server
// ======================
server.listen(PORT, () => {
  console.log(`🚀 Server running on PORT: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔒 CORS allowed for: ${allowedOrigins.join(", ")}`);
  connectDB();
});
