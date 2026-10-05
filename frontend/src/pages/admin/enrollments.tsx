// ขั้นที่ 10 (ฝั่ง ADMIN) — ใช้ enroll() ตัวเดียวกับหน้า student แต่ลงทะเบียนให้นักศึกษาคนไหนก็ได้
import { useState } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnrollmentStore } from "@/lib/enrollment-store";

type Option = { value: string; label: string };

function OptionSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(v) => onChange(v as string)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminEnrollmentsPage() {
  const { students, courses, enrollments, enroll } = useEnrollmentStore();

  const [formStudent, setFormStudent] = useState<string | null>(null);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [mode, setMode] = useState<"course" | "student">("course");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStudent, setFilterStudent] = useState("all");
  // Lecture 18: ข้อความ error จาก Backend + สถานะรอ API
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const studentOptions: Option[] = students.map((s) => ({
    value: s.studentId,
    label: `${s.studentId} — ${s.firstName} ${s.lastName}`,
  }));
  const courseOptions: Option[] = courses.map((c) => ({
    value: c.courseId,
    label: `${c.courseId} — ${c.courseTitle}`,
  }));

  const availableCourseOptions = courseOptions.filter(
    (c) =>
      !enrollments.some(
        (e) => e.studentId === formStudent && e.courseId === c.value,
      ),
  );

  // ขั้นที่ 10 — POST /api/v3/enrollments (ADMIN ลงให้ studentId ใดก็ได้)
  const handleEnroll = async () => {
    if (!formStudent || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(formStudent, formCourse);
      handleEnrollDialogOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollDialogOpenChange = (open: boolean) => {
    setEnrollDialogOpen(open);
    if (!open) {
      setFormStudent(null);
      setFormCourse(null);
      setServerError(null);
    }
  };

  // ขั้นที่ 20 — กรองจาก store ตามแท็บที่เลือก (ข้อมูลเปลี่ยน → ตาราง re-render เอง)
  const rows = enrollments.filter((e) =>
    mode === "course"
      ? filterCourse === "all" || e.courseId === filterCourse
      : filterStudent === "all" || e.studentId === filterStudent,
  );

  const nameOf = (studentId: string) => {
    const s = students.find((x) => x.studentId === studentId);
    return s ? `${s.firstName} ${s.lastName}` : "-";
  };
  const titleOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId)?.courseTitle ?? "-";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
      </div>

      <Dialog
        open={enrollDialogOpen}
        onOpenChange={handleEnrollDialogOpenChange}
      >
        <DialogTrigger render={<Button />}>
          <PlusCircle className="h-4 w-4" />
          ลงทะเบียนให้นักศึกษา
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ลงทะเบียนให้นักศึกษา</DialogTitle>
            <DialogDescription>
              เลือกนักศึกษาก่อน แล้วเลือกวิชาที่ยังไม่ได้ลงทะเบียน
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="formStudent">นักศึกษา</Label>
              <OptionSelect
                id="formStudent"
                options={studentOptions}
                value={formStudent}
                placeholder="เลือกนักศึกษา"
                onChange={(v) => {
                  setFormStudent(v);
                  setFormCourse(null);
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <OptionSelect
                id="formCourse"
                options={availableCourseOptions}
                value={formCourse}
                placeholder={
                  formStudent && availableCourseOptions.length === 0
                    ? "ลงทะเบียนครบทุกวิชาแล้ว"
                    : "เลือกวิชา"
                }
                onChange={setFormCourse}
              />
            </div>
          </div>
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <DialogFooter>
            <Button
              disabled={!formStudent || !formCourse || submitting}
              onClick={handleEnroll}
            >
              <PlusCircle className="h-4 w-4" />
              {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "course" | "student")}
      >
        <TabsList>
          <TabsTrigger value="course">ค้นหาตามวิชา</TabsTrigger>
          <TabsTrigger value="student">ค้นหาตามนักศึกษา</TabsTrigger>
        </TabsList>
        <TabsContent value="course" className="pt-2">
          <OptionSelect
            id="filterCourse"
            options={[{ value: "all", label: "ทุกวิชา" }, ...courseOptions]}
            value={filterCourse}
            onChange={setFilterCourse}
          />
        </TabsContent>
        <TabsContent value="student" className="pt-2">
          <OptionSelect
            id="filterStudent"
            options={[{ value: "all", label: "ทุกคน" }, ...studentOptions]}
            value={filterStudent}
            onChange={setFilterStudent}
          />
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสนักศึกษา</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  ไม่พบข้อมูลการลงทะเบียน
                </TableCell>
              </TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={`${e.studentId}-${e.courseId}`}>
                <TableCell>{e.studentId}</TableCell>
                <TableCell>{nameOf(e.studentId)}</TableCell>
                <TableCell>{e.courseId}</TableCell>
                <TableCell>{titleOf(e.courseId)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
