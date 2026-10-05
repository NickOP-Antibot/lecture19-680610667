// ขั้นที่ 5 — Authentication State
// จำว่าใคร Login อยู่ (token, username, role, studentId)
// - setAuth(token) เรียกจากหน้า Login (ขั้นที่ 6)
// - clear() เรียกตอน Logout (ขั้นที่ 6) หรือเมื่อ Backend ตอบ 401/403 (ขั้นที่ 18)
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/lib/types";

type AuthState = {
  token: string | null;
  username: string | null;
  role: User["role"] | null;
  studentId: string | null;
};

type AuthStore = AuthState & {
  setAuth: (token: string) => void;
  clear: () => void;
};

type JwtPayload = {
  username?: string;
  role?: User["role"];
  studentId?: string | null;
  exp?: number; // วินาที (Unix time)
};

const emptyAuth: AuthState = {
  token: null,
  username: null,
  role: null,
  studentId: null,
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

// token หมดอายุ (exp) → ถือว่ายังไม่ Login
function authFromToken(token: string | null | undefined): AuthState {
  if (!token) return emptyAuth;
  const payload = decodeJwt(token);
  if (!payload) return emptyAuth;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return emptyAuth;
  return {
    token,
    username: payload.username ?? null,
    role: payload.role ?? null,
    studentId: payload.studentId ?? null,
  };
}

// persist ลง localStorage เฉพาะ token
// ส่วน username / role / studentId ถอดจาก payload ของ JWT (authFromToken)
// ถอด JWT ฝั่ง Frontend เพื่อ "แสดงผล" เท่านั้น ไม่ได้ verify ลายเซ็น — Backend ตรวจเองทุก request
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...emptyAuth,
      setAuth: (token) => set(authFromToken(token)), // Login สำเร็จ → ถอด token เป็น state
      clear: () => set(emptyAuth), // Logout / token หมดอายุ
    }),
    {
      name: "lecture18-auth", // key ใน localStorage
      // เขียนลง localStorage แค่ token
      partialize: (state) => ({ token: state.token }),
      // ตอนโหลดกลับ (รีเฟรชหน้า) → ถอดค่าที่เหลือจาก token
      merge: (persisted, current) => ({
        ...current,
        ...authFromToken((persisted as Partial<AuthState> | undefined)?.token),
      }),
    },
  ),
);
