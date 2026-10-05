import axios, { AxiosError, type Method } from "axios";

import { useAuthStore } from "@/lib/auth-store";

/**
 * ขั้นที่ 4 — Frontend API Layer: ตัวกลางเรียก Backend API ด้วย axios (ทุกหน้าเรียกผ่าน api())
 *
 * - ต่อ URL จาก VITE_API_URL (ไฟล์ .env) เช่น http://localhost:3000/api/v3 → baseURL ของ axios
 * - แนบ Authorization: Bearer <token> ให้อัตโนมัติถ้า Login อยู่ (request interceptor)
 * - Backend ตอบรูปแบบ { success, data } หรือ { success: false, message, errors }
 *   ถ้าไม่สำเร็จจะ throw ApiError พร้อมข้อความจาก Backend ให้หน้าเว็บนำไปแสดง
 * - ขั้นที่ 18: 401/403 = token หมดอายุ / ถูก logout ไปแล้ว → ล้างสถานะ Login ให้ไปหน้า Login ใหม่
 */
export const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v3";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string;
};

// ── 4.1 axios instance กลาง — ทุก request ใช้ baseURL เดียวกัน ──────────
// (axios ตั้ง Content-Type: application/json และแปลง body เป็น JSON ให้เอง)
export const http = axios.create({ baseURL: API_URL });

// request interceptor: ทำงาน "ก่อน" ส่งทุก request
// แนบ token ทุก request ยกเว้นที่ตั้ง skipAuth (เช่น /users/login)
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token; // อ่าน store นอก React component
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`; // ← Backend อ่านตรงนี้ใน authenticateToken
  }
  return config;
});

// ให้ config รู้จัก field skipAuth (ใช้ภายใน interceptor ด้านบน)
declare module "axios" {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// ── 4.2 ฟังก์ชัน api() — แกะข้อมูลและแปลง error (ขั้นที่ 18: รับ Response จาก Backend) ─────────────────────────
export async function api<T>(
  path: string,
  options: { method?: Method; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  try {
    // ขั้นที่ 18 — Backend ตอบ { success, data } หรือ { success: false, message, errors }
    const res = await http.request<ApiResponse<T>>({
      url: path,
      method,
      data: body,
      skipAuth: !auth,
    });

    // บาง route ตอบ status 200 แต่ success: false
    if (res.data?.success === false) {
      throw new ApiError(
        res.status,
        res.data.errors ?? res.data.message ?? `Request failed (${res.status})`,
      );
    }
    return res.data.data as T; // ← คืนเฉพาะ data ให้หน้าเว็บใช้ต่อ
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const axiosErr = err as AxiosError<ApiResponse<T>>;
    // ไม่มี response = ต่อ server ไม่ได้ (server ไม่ได้รัน / CORS ไม่ผ่าน)
    if (!axiosErr.response) {
      throw new ApiError(0, `เชื่อมต่อ Backend ไม่ได้ (${API_URL})`);
    }

    const { status, data } = axiosErr.response;
    // 401/403 = token หมดอายุ / ถูก logout → ล้าง token → RootLayout พาไปหน้า Login เอง
    if (auth && (status === 401 || status === 403)) {
      useAuthStore.getState().clear();
    }
    // errors = ข้อความจาก zod (Validation failed), message = ข้อความทั่วไป
    throw new ApiError(
      status,
      data?.errors ?? data?.message ?? `Request failed (${status})`,
    );
  }
}
