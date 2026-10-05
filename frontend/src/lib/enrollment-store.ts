// ขั้นที่ 9 — Global Data Store
// เก็บ students, courses, enrollments ไว้ที่เดียว ทุกหน้าอ่านจากที่นี่
// - getAll()    → ขั้นที่ 8  (GET 3 endpoint พร้อมกัน)
// - enroll()    → ขั้นที่ 10 (POST /enrollments)
// - addCourse() / updateCourse() / removeCourse() → ขั้นที่ 11 (POST / PUT / DELETE /courses)
// สำเร็จแล้วแก้ state ทันที (ขั้นที่ 19) → หน้าที่ใช้ store re-render เอง (ขั้นที่ 20)
import { create } from "zustand";

import { api } from "@/lib/api";
import type { Course, Enrollment, Student, User } from "@/lib/types";

// ขั้นที่ 9 — รูปแบบข้อมูลที่ Backend ส่งมา (ต่างจาก type ฝั่ง Frontend เล็กน้อย)
type ApiStudent = Omit<Student, "emails"> & { emails?: string[] };
type ApiEnrollment = Enrollment & { createdAt?: string };

// Backend เก็บอีเมลเป็น string[] แต่ฟอร์ม (useFieldArray) ใช้ { address }[]
const fromApiStudent = (s: ApiStudent): Student => ({
  studentId: s.studentId,
  firstName: s.firstName,
  lastName: s.lastName,
  program: s.program,
  interests: s.interests ?? [],
  emails: (s.emails ?? []).map((address) => ({ address })),
});

// เลือกเฉพาะ field ที่ Frontend ใช้ (ตัด id / createdAt / updatedAt ทิ้ง)
const toCourse = ({ courseId, courseTitle, instructors }: Course): Course => ({
  courseId,
  courseTitle,
  instructors,
});

// Backend ใช้ชื่อ createdAt → Frontend ใช้ enrolledAt
const fromApiEnrollment = (e: ApiEnrollment): Enrollment => ({
  studentId: e.studentId,
  courseId: e.courseId,
  enrolledAt: e.createdAt,
});

type EnrollmentStore = {
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  /** โหลดข้อมูลจาก Backend (GET 3 endpoint พร้อมกัน) ตาม role ของผู้ใช้ */
  getAll: (role: User["role"], studentId?: string | null) => Promise<void>;
  /** ล้างข้อมูลทั้งหมด (ตอน Logout — กันข้อมูลของ user ก่อนหน้าค้างอยู่) */
  reset: () => void;
  /** POST /courses — throw ApiError ถ้า Backend ไม่รับ */
  addCourse: (course: Course) => Promise<void>;
  /** PUT /courses — แก้ชื่อวิชา/ผู้สอน (courseId แก้ไม่ได้) */
  updateCourse: (course: Course) => Promise<void>;
  /** DELETE /courses — Backend ลบการลงทะเบียนของวิชานี้ให้ด้วย */
  removeCourse: (courseId: string) => Promise<void>;
  /** POST /enrollments — throw ApiError ถ้า Backend ไม่รับ */
  enroll: (studentId: string, courseId: string) => Promise<void>;
};

// ขั้นที่ 9 — รูปแบบ action ที่เขียนข้อมูล (ใช้ซ้ำทุกตัวในขั้นที่ 10–11)
// 1) ส่งไป Backend  2) ถ้า error → api() throw ออกไปให้ฟอร์มแสดง (state ไม่เปลี่ยน)
// 3) สำเร็จ → (ขั้นที่ 19) เอา "ข้อมูลที่ Backend ตอบกลับ" มาอัปเดต state
export const useEnrollmentStore = create<EnrollmentStore>()((set) => ({
  students: [],
  courses: [],
  enrollments: [],
  loading: false,
  error: null,

  // ขั้นที่ 8 — GET หลาย endpoint พร้อมกัน แยกตาม role
  getAll: async (role, studentId) => {
    set({ loading: true, error: null });
    try {
      // STUDENT เรียก GET /students (ทั้งหมด) ไม่ได้ → ดึงแค่ของตัวเอง
      const studentsRequest =
        role === "ADMIN"
          ? api<ApiStudent[]>("/students")
          : studentId
            ? api<ApiStudent>(`/students/${studentId}`).then((s) => [s])
            : Promise.resolve([] as ApiStudent[]);

      // Promise.all = ยิง 3 request พร้อมกัน รอจนครบทุกตัว (เร็วกว่ายิงทีละตัว)
      const [students, courses, enrollments] = await Promise.all([
        studentsRequest,
        api<Course[]>("/courses"),
        api<ApiEnrollment[]>("/enrollments"), // Backend กรองให้ STUDENT เห็นแค่ของตัวเอง
      ]);
      set({
        students: students.map(fromApiStudent),
        courses: courses.map(toCourse),
        enrollments: enrollments.map(fromApiEnrollment),
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message }); // → แถบ error ใน RootLayout
    }
  },

  reset: () =>
    set({
      students: [],
      courses: [],
      enrollments: [],
      loading: false,
      error: null,
    }),

  // ขั้นที่ 11 — Add — POST /courses, body = { courseId, courseTitle, instructors }
  addCourse: async (course) => {
    const created = await api<Course>("/courses", {
      method: "POST",
      body: course,
    });
    set((state) => ({ courses: [...state.courses, toCourse(created)] })); // ขั้นที่ 19 — ต่อท้าย
  },

  // ขั้นที่ 11 — Update — PUT /courses (courseId แก้ไม่ได้ ใช้หาว่าจะแก้วิชาไหน)
  updateCourse: async (course) => {
    const updated = await api<Course>("/courses", {
      method: "PUT",
      body: course,
    });
    set((state) => ({
      courses: state.courses.map((c) =>
        c.courseId === updated.courseId ? toCourse(updated) : c, // ขั้นที่ 19 — แทนที่ตัวเดิม
      ),
    }));
  },

  // ขั้นที่ 11 — Delete — DELETE /courses, body = { courseId }
  removeCourse: async (courseId) => {
    await api<Course>("/courses", {
      method: "DELETE",
      body: { courseId },
    });
    // ขั้นที่ 19 — Backend ลบ enrollments ของวิชานี้ไปแล้ว — ฝั่งนี้ตัดออกให้ตรงกัน
    set((state) => ({
      courses: state.courses.filter((c) => c.courseId !== courseId),
      enrollments: state.enrollments.filter((e) => e.courseId !== courseId),
    }));
  },

  // ขั้นที่ 10 — POST /enrollments, body = { studentId, courseId }
  enroll: async (studentId, courseId) => {
    const created = await api<ApiEnrollment>("/enrollments", {
      method: "POST",
      body: { studentId, courseId },
    });
    // ขั้นที่ 19 — Backend บันทึกแล้ว → เพิ่มลง state (createdAt → enrolledAt)
    set((state) => ({
      enrollments: [...state.enrollments, fromApiEnrollment(created)],
    }));
  },
}));
