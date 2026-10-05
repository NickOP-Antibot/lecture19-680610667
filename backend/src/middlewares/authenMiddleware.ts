// ขั้นที่ 13 — JWT Authentication: "เป็นใคร?"
// อ่าน Authorization: Bearer <token> (api.ts แนบมาให้ — ขั้นที่ 4)
// ไม่มี token → 401, token ผิด/หมดอายุ → 403, ผ่าน → req.user = { username, studentId, role }
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

import { type CustomRequest, type UserPayload } from "../libs/types.ts";
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

export const authenticateToken = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header is required",
    });
  }

  // console.log("authHeader:", authHeader);
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.status(401).json({
      success: false,
      message: "Token is required",
    });

  try {
    // Verify token ด้วย JWT_SECRET (ต้องตรงกับตอน sign ในขั้นที่ 3)
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    jwt.verify(token, jwt_secret, async (err, user) => {
      
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token, token removed",
        });

      }

      // Attach user payload to (custom) request
      req.user = user as UserPayload;
      req.token = token;

      // Proceed to next middleware or route handler
      next();
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong with authentication process",
      error: err,
    });
  }
};

// Apply this middleware to protected routes:
// app.get('/profile', authenticateToken, (req: CustomRequest, res) => { /* ... */ });
