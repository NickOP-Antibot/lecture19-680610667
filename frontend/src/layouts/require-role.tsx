import { Navigate, Outlet } from "react-router";

import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

/**
 * ขั้นที่ 7 — Authorization (Frontend): กันหน้าตาม role — ใช้เป็น element ของ route แม่ (ครอบกลุ่มหน้า /admin หรือ /student)
 * role ไม่ตรง → กลับหน้าแรก (เมนูใน Sidebar ก็ซ่อนหน้าที่ไม่มีสิทธิ์อยู่แล้ว
 * อันนี้กันกรณีพิมพ์ URL ตรงๆ) — Backend ตรวจสิทธิ์ซ้ำอีกชั้นเสมอ (ขั้นที่ 13–14)
 */
export default function RequireRole({ role }: { role: User["role"] }) {
  const currentRole = useAuthStore((s) => s.role);
  if (currentRole !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
