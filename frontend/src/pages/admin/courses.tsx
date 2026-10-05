// ขั้นที่ 11 — Admin Flow: หน้าจัดการวิชา
// - <CourseFormDialog /> → เพิ่มวิชา (addCourse → POST /courses)
// - <CourseTable />      → แก้วิชา (updateCourse → PUT) / ลบวิชา (removeCourse → DELETE)
import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { CourseTable } from "@/components/courses/course-table";
import { useEnrollmentStore } from "@/lib/enrollment-store";

export default function AdminCoursesPage() {
  const courseCount = useEnrollmentStore((s) => s.courses.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการวิชาเรียน</h1>
          <p className="text-sm text-muted-foreground">
            {courseCount} วิชา — เพิ่มวิชาใหม่ที่นี่แล้วจะไปโผล่เป็นตัวเลือก
            ตอนลงทะเบียนให้นักศึกษาที่หน้า "จัดการการลงทะเบียน" ทันที
          </p>
        </div>
        <CourseFormDialog />
      </div>

      <CourseTable />
    </div>
  );
}
