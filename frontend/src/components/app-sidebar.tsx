// ขั้นที่ 6 — Logout UI (handleLogout) + เมนูด้านข้างแยกตาม role
import { BookOpen, Home, Library, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

// เมนูแยกตาม role — ต้องตรงกับ route ที่ RequireRole ครอบไว้ใน main.tsx
const itemsByRole = {
  ADMIN: [
    { title: "หน้าแรก", url: "/", icon: Home },
    { title: "จัดการการลงทะเบียน", url: "/admin/enrollments", icon: BookOpen },
    { title: "จัดการวิชาเรียน", url: "/admin/courses", icon: Library },
  ],
  STUDENT: [
    { title: "หน้าแรก", url: "/", icon: Home },
    {
      title: "จัดการการลงทะเบียน",
      url: "/student/enrollments",
      icon: BookOpen,
    },
  ],
};

export function AppSidebar() {
  const location = useLocation();
  const username = useAuthStore((s) => s.username) ?? "";
  const role = useAuthStore((s) => s.role);
  const clear = useAuthStore((s) => s.clear);
  const items = role ? itemsByRole[role] : [];

  // ขั้นที่ 6 — POST /users/logout ลบ token ทั้งหมดของ user ใน DB — ไม่ว่าสำเร็จหรือไม่ก็ล้างฝั่งเราด้วย
  // (ล้างแล้ว RootLayout จะพาไปหน้า Login เอง)
  const handleLogout = async () => {
    try {
      await api("/users/logout", { method: "POST" });
    } catch {
      // token หมดอายุไปแล้วก็ไม่เป็นไร
    } finally {
      clear();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">CPE & ISNE</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.url}
                    render={<Link to={item.url} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-2" />
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar>
            <AvatarImage src="/profile.svg" alt={username} />
            <AvatarFallback>{username.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{username}</span>
            <Badge variant="outline" className="w-fit text-[10px]">
              {role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="ออกจากระบบ"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
