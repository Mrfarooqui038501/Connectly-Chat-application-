import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Cookie configuration
  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Important for cross-origin requests
    domain: process.env.NODE_ENV === "production" ? undefined : undefined, // Let browser handle domain
  };

  console.log(`🍪 Setting cookie with options:`, cookieOptions);

  res.cookie("jwt", token, cookieOptions);

  return token;
};

export const clearToken = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 0 // Expire immediately
  };

  res.cookie("jwt", "", cookieOptions);
  console.log("🍪 Cookie cleared");
};