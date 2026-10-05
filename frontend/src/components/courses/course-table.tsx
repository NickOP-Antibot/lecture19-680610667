// ขั้นที่ 11 — ตารางวิชา (ADMIN): ปุ่มแก้ (CourseFormDialog) + ปุ่มลบ (ConfirmDeleteButton → removeCourse)
// ขั้นที่ 20 — อ่าน courses จาก store → เพิ่ม/แก้/ลบสำเร็จแล้วตารางอัปเดตเอง
import { useState } from "react";

import { ConfirmDeleteButton } from "@/components/confirm-button";
import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEnrollmentStore } from "@/lib/enrollment-store";


export function CourseTable() {
  const courses = useEnrollmentStore((s) => s.courses);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  // ขั้นที่ 11 — action ลบวิชาจาก store
  const removeCourse = useEnrollmentStore((s) => s.removeCourse);
  // ข้อความ error จาก Backend ตอนลบไม่สำเร็จ
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ขั้นที่ 11 — กดยืนยันลบ → DELETE /courses (ไม่สำเร็จ → deleteError)
  const handleDelete = async (courseId: string) => {
    setDeleteError(null);
    try {
      await removeCourse(courseId); // DELETE /courses
    } catch (err) {
      setDeleteError((err as Error).message); // แสดง "ลบไม่สำเร็จ: ..." เหนือตาราง
    }
  };

  const enrollCountOf = (courseId: string) =>
    enrollments.filter((e) => e.courseId === courseId).length;

  return (
    <div className="space-y-2">
      {deleteError && (
        <p className="text-sm text-destructive">ลบไม่สำเร็จ: {deleteError}</p>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead className="w-24 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่มีวิชาที่เปิดสอน
                </TableCell>
              </TableRow>
            )}
            {courses.map((course) => (
              <TableRow key={course.courseId}>
                <TableCell>{course.courseId}</TableCell>
                <TableCell>{course.courseTitle}</TableCell>
                <TableCell>
                  {/* แสดงรายชื่อผู้สอนเป็นข้อความธรรมดา คั่นด้วย ", " */}
                  {course.instructors.length === 0 ? (
                    <span className="text-muted-foreground">
                      ยังไม่มีผู้สอน
                    </span>
                  ) : (
                    course.instructors.join(", ")
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <CourseFormDialog course={course} />
                  <ConfirmDeleteButton
                    label={`ลบวิชา ${course.courseId}`}
                    title={`ลบวิชา ${course.courseId}?`}
                    description={`${course.courseTitle} — การลงทะเบียนของวิชานี้ ${enrollCountOf(course.courseId)} รายการจะถูกลบไปด้วย`}
                    onConfirm={() => handleDelete(course.courseId)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
