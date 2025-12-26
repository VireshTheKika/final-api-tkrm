import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// 🔒 Verify JWT token and attach user to request
export const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header has Bearer token
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Decode JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to request
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(404).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};

// 🧑‍💼 Restrict access to Admins and Managers
export const adminOrManagerOnly = (req, res, next) => {
  if (req.user && (req.user.role === "Admin" || req.user.role === "Manager")) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin or Manager only." });
  }
};

// 👑 Restrict access to Admin only (for changing roles, deleting users, etc.)
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "Admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin only." });
  }
};
