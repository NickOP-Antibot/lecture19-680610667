// ขั้นที่ 11 — กฎตรวจฟอร์มวิชาฝั่ง Frontend (ช่วยให้ใช้งานง่าย — Backend ตรวจซ้ำในขั้นที่ 15)
// - courseId    ตัวเลข 6 หลัก และไม่ซ้ำ
// - courseTitle 6–100 ตัวอักษร
// - instructors อย่างน้อย 1 คน
import type { Course } from "@/lib/types";

export type CourseFormValues = {
  courseId: string;
  courseTitle: string;
  instructors: string[];
};

export type CourseFormErrors = Partial<Record<keyof CourseFormValues, string>>;

export const emptyCourseForm: CourseFormValues = {
  courseId: "",
  courseTitle: "",
  instructors: [],
};

export const COURSE_TITLE_MIN = 6;
export const COURSE_TITLE_MAX = 100;

export function validateCourseField(
  name: keyof CourseFormValues,
  values: CourseFormValues,
  existingCourses: Course[],
): string | undefined {
  switch (name) {
    case "courseId": {
      const id = values.courseId.trim();
      if (!/^\d{6}$/.test(id)) return "รหัสวิชาต้องเป็นตัวเลข 6 หลัก";
      if (existingCourses.some((c) => c.courseId === id))
        return `มีรหัสวิชา ${id} นี้แล้ว`;
      return undefined;
    }
    case "courseTitle": {
      const title = values.courseTitle.trim();
      if (title === "") return "กรอกชื่อวิชา";
      if (title.length < COURSE_TITLE_MIN)
        return `ชื่อวิชาต้องมีอย่างน้อย ${COURSE_TITLE_MIN} ตัวอักษร`;
      if (title.length > COURSE_TITLE_MAX)
        return `ชื่อวิชายาวได้ไม่เกิน ${COURSE_TITLE_MAX} ตัวอักษร`;
      return undefined;
    }
    case "instructors":
      return values.instructors.length === 0
        ? "เลือกผู้สอนอย่างน้อย 1 คน"
        : undefined;
  }
}

export function validateCourseForm(
  values: CourseFormValues,
  existingCourses: Course[],
): CourseFormErrors {
  const errors: CourseFormErrors = {};
  for (const name of Object.keys(values) as (keyof CourseFormValues)[]) {
    const message = validateCourseField(name, values, existingCourses);
    if (message) errors[name] = message;
  }
  return errors;
}
