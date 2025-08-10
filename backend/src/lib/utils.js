import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    // Remove domain restriction to allow any frontend URL
    // domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
  };

  res.cookie("jwt", token, cookieOptions);
  return token;
};

export const clearToken = (res) => {
  const cookieOptions = {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    // Remove domain restriction to allow any frontend URL
    // domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
  };

  res.cookie("jwt", "", cookieOptions);
};