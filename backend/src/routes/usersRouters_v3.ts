// ขั้นที่ 3 — Login API
// POST /api/v3/users/login  → ตรวจรหัสผ่าน (bcrypt) แล้วออก JWT
// POST /api/v3/users/logout → ล้าง user.tokens ทำให้ token เดิมใช้ไม่ได้อีก (checkRoles ขั้นที่ 14 จะปฏิเสธ)
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
dotenv.config();

import type { User, CustomRequest } from "../libs/types.ts";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// Password utility functions
import { comparePassword } from "../utils/compare.ts";
import { hashPassword } from "../utils/hash.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

// Validators
import { zUserBody } from "../libs/zodValidators.ts";

const router = Router();

// GET /api/v3/users

// GET /api/v3/users/:userId
router.get(
  "/:userId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      // get user, token from CustomRequest (token payload)
      const user = req.user;
      const token = req.token;

      // get parameterized variable: userId (ObjectId)
      const userId = req.params.userId as string;
      let found_user = null;

      if (userId) {
        // get user from DB by ObjectId
        found_user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });
      }

      // STUDENT token? AND token's owner try to access other student data?
      if (
        user?.role === "STUDENT" &&
        found_user?.studentId !== user?.studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      // ADMIN token OR token's owner access his own data
      return res.json({
        success: true,
        data: found_user,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/users

// ขั้นที่ 3 — POST /api/v3/users/login, body = { username, password }
router.post("/login", async (req: Request, res: Response) => {
  try {
    // get username and password from body
    const { username, password } = req.body;
    // get a user from DB by username
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // if user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // found a user, compare passwords (bcrypt — utils/compare.ts) ไม่ตรง → 401
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // ขั้นที่ 3 — สร้าง JWT (payload: username, studentId, role) อายุ 30 นาที
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    // ใส่ข้อมูลผู้ใช้ไว้ใน payload ของ JWT (Frontend ถอดออกมาแสดงผลได้)
    const token = jwt.sign(
      {
        // create JWT Payload
        username: user.username,
        studentId: user.studentId,
        role: user.role,
      },
      jwt_secret,
      { expiresIn: "30m" }, // หมดอายุใน 30 นาที
    );

    // remove expired tokens, then store the new token in user.tokens
    const validTokens = (user.tokens ?? []).filter((t: string) => {
      try {
        jwt.verify(t, jwt_secret);
        return true;
      } catch {
        return false;
      }
    });
    user.tokens = [...validTokens, token];

    // update user.tokens in the DB — ขั้นที่ 14 เช็กว่า token ยังอยู่ในนี้
    const updatedUser = await prisma.user.update({
      where: {
        username: user.username,
      },
      data: {
        tokens: user.tokens,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        username: user.username,
        // ขั้นที่ 3 — Frontend ใช้ 3 ค่านี้: token ล่าสุด (แนบใน Authorization header) และ role/studentId
        token,
        role: user.role,
        studentId: user.studentId,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

// POST /api/v3/users/logout
router.post(
  "/logout",
  authenticateToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const payload = req.user;
      const token = req.token;
      // get a user from DB by username from payload
      const user = await prisma.user.findUnique({
        where: {
          username: payload?.username,
        },
      });

      // if user not found
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // delete all tokens by setting array size = 0 (Logout — เรียกจาก app-sidebar ขั้นที่ 6)
      user.tokens.length = 0;

      // update user.tokens on DB
      const updatedUser = await prisma.user.update({
        where: { username: user.username },
        data: { tokens: user.tokens },
      });

      return res.status(200).json({
        success: true,
        message: "Logout successful",
        data: updatedUser,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// DELETE /api/v3/users, body = {username}
// delete a user (ADMIN only)
router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const username = req.body?.username;
      if (typeof username !== "string" || username.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: "username is required",
        });
      }

      // ADMIN must not delete his own account
      if (username === req.user?.username) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      // check if the user exists in DB
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User ${username} does not exists`,
        });
      }

      const deleted = await prisma.user.delete({ where: { username } });

      // do not send password/tokens back
      const { password, tokens, ...safeUser } = deleted;
      return res.status(200).json({
        success: true,
        message: `User ${username} has been deleted successfully`,
        data: safeUser,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

export default router;
