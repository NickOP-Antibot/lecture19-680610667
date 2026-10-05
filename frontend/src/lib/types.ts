interface Student {
  studentId: string;
  firstName: string;
  lastName: string;
  program: "CPE" | "ISNE";
  courses?: string[];
  interests?: string[];
  emails?: StudentEmail[];
}
export type { Student };

interface StudentEmail {
  address: string;
}
export type { StudentEmail };

// วิชาที่เปิดสอน 1 วิชา
interface Course {
  courseId: string;
  courseTitle: string;
  instructors: string[];
}
export type { Course };

interface Enrollment {
  studentId: string;
  courseId: string;
  enrolledAt?: string;
}
export type { Enrollment };

interface User {
  username: string;
  password: string;
  studentId?: string | null;
  role: "STUDENT" | "ADMIN";
  tokens?: string[];
}
export type { User };
