// ขั้นที่ 7 — Authentication (Frontend): ยังไม่ Login → ไปหน้า /login
// ขั้นที่ 8 — Initial Data Loading: Login แล้วเรียก getAll() โหลดข้อมูลครั้งเดียว
import { useEffect } from "react";
import { Navigate, Outlet } from "react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const { loading, error, getAll, reset } = useEnrollmentStore();

  // ขั้นที่ 8 — Login แล้ว → โหลดข้อมูลจาก Backend ครั้งเดียว (ตาม role) ทุกหน้าใช้ store ร่วมกัน
  // Logout / token หมดอายุ → ล้างข้อมูลของ user ก่อนหน้าทิ้ง
  useEffect(() => {
    if (token && role) getAll(role, studentId);
    else reset();
  }, [token, role, studentId, getAll, reset]);

  // ขั้นที่ 7 — ยังไม่ Login (หรือ token หมดอายุ api.ts ล้างทิ้งแล้ว) → ไปหน้า Login
  if (!token) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">ระบบลงทะเบียนเรียน</span>
          </div>
          <ModeToggle />
        </header>
        <main className="flex-1 p-4">
          {/* ขั้นที่ 8 — โหลดไม่สำเร็จ → แสดง error + ปุ่มลองใหม่ */}
          {error && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-destructive/50 p-3 text-sm text-destructive">
              <span>โหลดข้อมูลไม่สำเร็จ: {error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => role && getAll(role, studentId)}
              >
                ลองใหม่
              </Button>
            </div>
          )}
          {/* ขั้นที่ 8 — ระหว่างโหลด */}
          {loading && (
            <p className="mb-4 text-sm text-muted-foreground">
              กำลังโหลดข้อมูลจาก Backend...
            </p>
          )}
          {/* ขั้นที่ 20 — หน้าลูก (pages/*) อ่านข้อมูลจาก store แล้ว re-render เอง */}
          <Outlet />
        </main>
        <footer className="border-t p-4 text-center text-xs text-muted-foreground">
          ระบบลงทะเบียนเรียน{" "}
          {role === "ADMIN"
            ? "ฝั่งผู้ดูแลระบบ"
            : "ฝั่งนักศึกษา จัดทำโดย นศ. ชื่อ-สกุล student name รหัส นศ. student id"}
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
