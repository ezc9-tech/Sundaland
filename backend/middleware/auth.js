import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.ts";

export const verifyToken = async (req, res, next) => {
  let decoded;
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "This account has been disabled." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "There was an internal server error" });
  }
};

export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. User data missing from token." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Admin access required." });
  }

  next(); 
};