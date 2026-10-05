// ./prisma/seed.ts
// Import initial data from ./src/db/*.json into MongoDB (แทนการ import ผ่าน MongoDB Compass)
// Run: pnpm db:seed
// รันซ้ำได้ — ข้อมูลที่มีอยู่แล้ว (studentId / courseId / username ซ้ำ) จะถูกข้าม ไม่เขียนทับ
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "../generated/prisma/client.ts";

const prisma = new PrismaClient();

// JSON ที่ export จาก MongoDB เก็บวันที่เป็น { "$date": "..." } — แปลงเป็น Date
type ExtDate = { $date: string };
const toDate = (d?: ExtDate) => (d ? new Date(d.$date) : undefined);

const readJson = <T>(file: string): T[] =>
  JSON.parse(
    readFileSync(path.join(process.cwd(), "src", "db", file), "utf-8"),
  );

type StudentJson = {
  studentId: string;
  firstName: string;
  lastName: string;
  program: string;
  programId: number;
  interests?: string[];
  emails?: string[];
  createdAt?: ExtDate;
  updatedAt?: ExtDate;
};
type CourseJson = {
  courseId: string;
  courseTitle: string;
  instructors: string[];
  createdAt?: ExtDate;
  updatedAt?: ExtDate;
};
type UserJson = {
  username: string;
  password: string; // bcrypt hash อยู่แล้ว — ไม่ต้อง hash ซ้ำ
  studentId?: string | null;
  role: "STUDENT" | "ADMIN";
  createdAt?: ExtDate;
  updatedAt?: ExtDate;
};

async function main() {
  const students = readJson<StudentJson>("db_students.json");
  for (const s of students) {
    await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: {},
      create: {
        ...s,
        // field ที่ JSON เดิมไม่มี → ใส่ [] ให้ครบตาม schema.prisma
        interests: s.interests ?? [],
        emails: s.emails ?? [],
        createdAt: toDate(s.createdAt),
        updatedAt: toDate(s.updatedAt),
      },
    });
  }
  console.log(`students: ${students.length} records`);

  const courses = readJson<CourseJson>("db_courses.json");
  for (const c of courses) {
    await prisma.course.upsert({
      where: { courseId: c.courseId },
      update: {},
      create: {
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
      },
    });
  }
  console.log(`courses: ${courses.length} records`);

  const users = readJson<UserJson>("db_users.json");
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        ...u,
        tokens: [],
        createdAt: toDate(u.createdAt),
        updatedAt: toDate(u.updatedAt),
      },
    });
  }
  console.log(`users: ${users.length} records`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
