// ขั้นที่ 6 — Login UI
// กรอกฟอร์ม → ตรวจด้วย Zod (loginSchema) → POST /users/login (ขั้นที่ 3)
// → setAuth(token) (ขั้นที่ 5) → ไปหน้า "/"
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

// ตรวจฟอร์มฝั่ง Frontend ก่อน — ไม่ผ่านจะไม่ส่ง request
const loginSchema = z.object({
  username: z.string().trim().min(1, "กรอกชื่อผู้ใช้"),
  password: z.string().min(1, "กรอกรหัสผ่าน"),
});
type LoginValues = z.infer<typeof loginSchema>;

// ขั้นที่ 6 — data ที่ POST /api/v3/users/login ตอบกลับมา (ขั้นที่ 3)
type LoginResponse = {
  username: string;
  token: string;
  role: User["role"];
  studentId?: string | null;
};

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Login อยู่แล้ว → ไม่ต้องเห็นหน้านี้ ไปหน้าแรกเลย
  if (token) return <Navigate to="/" replace />;

  // ขั้นที่ 6 — กดเข้าสู่ระบบ (เข้าฟังก์ชันนี้ได้ต่อเมื่อผ่าน loginSchema แล้ว)
  async function onSubmit(values: LoginValues) {
    try {
      const data = await api<LoginResponse>("/users/login", {
        method: "POST",
        body: values, // { username, password }
        auth: false, // ยังไม่มี token → ไม่ต้องแนบ
      });
      setAuth(data.token); // เก็บ token ลง auth-store
      navigate("/", { replace: true }); // ไปหน้าแรก
    } catch (err) {
      // เช่น 401 "Invalid username or password" → แสดงใต้ฟอร์ม
      form.setError("root", { message: (err as Error).message });
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เข้าสู่ระบบ</CardTitle>
          <CardDescription>
            ระบบลงทะเบียนเรียน CPE & ISNE (ADMIN / STUDENT)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup className="gap-4">
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="username">ชื่อผู้ใช้</FieldLabel>
                    <Input
                      {...field}
                      id="username"
                      autoComplete="username"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              {form.formState.errors.root && (
                <FieldError errors={[form.formState.errors.root]} />
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <LogIn className="h-4 w-4" />
                {form.formState.isSubmitting
                  ? "กำลังเข้าสู่ระบบ..."
                  : "เข้าสู่ระบบ"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
