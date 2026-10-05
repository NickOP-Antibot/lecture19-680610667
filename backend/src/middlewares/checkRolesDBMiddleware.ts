// ขั้นที่ 14 — Role Authorization: "ทำอะไรได้?" (STUDENT หรือ ADMIN ก็ผ่าน)
// ผ่านเมื่อ user มีอยู่จริง และ token ยังอยู่ใน user.tokens (ยังไม่ Logout) — ไม่ผ่าน → 401
import { type Request, type Response, type NextFunction } from "express";
import { type CustomRequest, type User } from "../libs/types.ts";

import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

export const checkRoles = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  // get payload and token from (custom) request
  const payload = req.user;
  const token = req.token;

  // find user by payload.username
  // const user = users.find((u: User) => u.username === payload?.username);
  const user = await prisma.user.findUnique({
    where: { username: payload?.username}
  });

  // check if user exists (either STUDENT or ADMIN)
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user",
    });
  }

  // check if token exists in user.tokens (Logout แล้วจะถูกล้าง — ขั้นที่ 3)
  if (
    !user.tokens ||
    typeof token !== "string" ||
    !user.tokens.includes(token)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Proceed to next middleware or route handler
  next();
};
