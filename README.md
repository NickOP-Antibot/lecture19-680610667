# lecture19-2569-starter — fullstack: เชื่อม Frontend กับ Backend API

## คำอธิบาย

- **Frontend:** React + Vite (`:5173`) อยู่ในโฟลเดอร์ `frontend/`
- **Backend:** Express (`:3000`) อยู่ในโฟลเดอร์ `backend/` ทุก API ขึ้นต้นด้วย `/api/v3`
- **Database:** MongoDB เข้าถึงผ่าน Prisma
- **Role:** มี 2 แบบคือ `STUDENT` และ `ADMIN`

---

## ภาพรวม 20 ขั้น

```text
1. Environment
   │
   ├── backend/.env
   └── frontend/.env
          ↓
2. Backend Configuration
   │
   └── backend/src/index.ts
          ↓
3. Login API
   │
   └── backend/src/routes/usersRouters_v3.ts
          ↓
4. Frontend API Layer
   │
   └── frontend/src/lib/api.ts
          ↓
5. Authentication State
   │
   └── frontend/src/lib/auth-store.ts
          ↓
6. Login / Logout UI
   │
   ├── frontend/src/pages/login.tsx
   └── frontend/src/components/app-sidebar.tsx
          ↓
7. Authentication / Authorization (Frontend)
   │
   ├── frontend/src/layouts/root-layout.tsx   (ยังไม่ Login → ไปหน้า /login)
   └── frontend/src/layouts/require-role.tsx  (role ไม่ตรง → กลับหน้าแรก)
          ↓
8. Initial Data Loading
   │
   └── frontend/src/layouts/root-layout.tsx
          ↓
9. Global Data Store
   │
   └── frontend/src/lib/enrollment-store.ts
          ↓
     ┌────┴──────────────┐
     ↓                   ↓
10. Student Flow      11. Admin Flow
     ↓                   ↓
enroll()             addCourse()
                     updateCourse()
                     removeCourse()
     ↓                   ↓
     └─────────┬─────────┘
               ↓
12. Backend API          (routes/coursesRouters_v3.ts, routes/             enrollmentsRouters_v3.ts)
               ↓
13. JWT Authentication   (middlewares/authenMiddleware.ts)
               ↓
14. Role Authorization   (middlewares/checkRolesDBMiddleware.ts, checkRoleAdminDBMiddleware.ts)
               ↓
15. Zod Validation       (libs/zodValidators.ts)
               ↓
16. Prisma               (generated/prisma/client.ts)
               ↓
17. MongoDB              (prisma/schema.prisma)
               ↓
18. Response             (frontend/src/lib/api.ts)
               ↓
19. Update Store         (frontend/src/lib/enrollment-store.ts)
               ↓
20. React UI Update      (pages / components)
```

> ขั้น 1–9 คือ "เตรียมระบบ + Login + โหลดข้อมูล"
> ขั้น 10–20 คือ "สิ่งที่เกิดขึ้นทุกครั้งที่กดปุ่ม เพิ่ม / แก้ / ลบ / ลงทะเบียน"

---

## 1. Environment

**ไฟล์:** `backend/.env`, `frontend/.env` (คัดลอกจาก `.env.example`)

**ทำอะไร:** เก็บค่าที่เปลี่ยนตามเครื่อง ไม่เขียนตายตัวในโค้ด

```env
# backend/.env
PORT=3000
JWT_SECRET=this_is_my_very_awesome_secret
DATABASE_URL=mongodb+srv://[username]:[password]@[hostname]/[database]?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:5173
```

```env
# frontend/.env
VITE_API_URL=http://localhost:3000/api/v3
```

- ชื่อฐานข้อมูลคือส่วน `[database]` ใน `DATABASE_URL`
- `VITE_API_URL` มี `/api/v3` อยู่แล้ว ฝั่ง Frontend จึงเรียกแค่ `"/courses"`, `"/users/login"`

**ต่อไป:** Backend อ่านค่าเหล่านี้ใน `index.ts` → ขั้น 2

---

## 2. Backend Configuration

**ไฟล์:** `backend/src/index.ts`

**ทำอะไร:** สร้าง Express app, เปิด CORS ให้ Frontend (คนละ port) เรียกได้, ผูก router

```ts
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
  }),
);
app.use(express.json());

app.use("/api/v3/users", userRouter_v3);
app.use("/api/v3/students", studentRouter_v3);
app.use("/api/v3/courses", courseRouter_v3);
app.use("/api/v3/enrollments", enrollmentRouter_v3);
```

- ทดลองปิด CORS → Browser จะ block และหน้าเว็บขึ้น "เชื่อมต่อ Backend ไม่ได้"
- route ที่ไม่มีจริง → `notFoundMiddleware` ตอบ `404`

**ต่อไป:** route แรกที่ต้องมีคือ Login → ขั้น 3

---

## 3. Login API

**ไฟล์:** `backend/src/routes/usersRouters_v3.ts` (+ `backend/src/utils/compare.ts`)

**ทำอะไร:** ตรวจรหัสผ่าน แล้วออก Token

```text
POST /api/v3/users/login  { username, password }
   ↓
หา user ใน DB             (prisma.user.findUnique)     ไม่พบ   → 401
   ↓
ตรวจรหัสผ่านด้วย bcrypt      (comparePassword)            ไม่ตรง → 401
   ↓
สร้าง JWT                  jwt.sign({ username, studentId, role }, JWT_SECRET, { expiresIn: "30m" })
   ↓
เก็บ token ลง user.tokens  (prisma.user.update)
   ↓
ตอบ 200 { token, role, studentId }
```

- มี `POST /api/v3/users/logout` ด้วย: ล้าง `user.tokens` ทั้งหมด → token เดิมใช้ไม่ได้อีก

**ต่อไป:** Frontend ต้องมีตัวกลางสำหรับเรียก API → ขั้น 4

---

## 4. Frontend API Layer

**ไฟล์:** `frontend/src/lib/api.ts`

**ทำอะไร:** ทุกหน้าเรียก Backend ผ่าน `api()` ตัวเดียว ซึ่ง

1. แนบ token ให้อัตโนมัติ
2. คืนเฉพาะ `data` จาก response
3. ถ้า error → `throw ApiError` พร้อมข้อความจาก Backend

```ts
// แนบ token ทุก request
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**ต่อไป:** token มาจาก `useAuthStore` → ขั้น 5

---

## 5. Authentication State

**ไฟล์:** `frontend/src/lib/auth-store.ts`

**ทำอะไร:** จำว่าใคร Login อยู่ (`token, username, role, studentId`)

| Function         | หน้าที่                                                     |
| ---------------- | ----------------------------------------------------------- |
| `setAuth(token)` | รับ token → decode JWT เพื่อเอา `username, role, studentId` |
| `clear()`        | ล้างทุกอย่าง (Logout)                                       |

- บันทึกลง `localStorage` ชื่อ `"lecture18-auth"` (เก็บ **เฉพาะ token**) → refresh หน้าแล้วยัง Login อยู่
- token หมดอายุ (`exp`) → ถือว่ายังไม่ Login

**ต่อไป:** หน้า Login เรียก `setAuth()` → ขั้น 6

---

## 6. Login / Logout UI

**ไฟล์:** `frontend/src/pages/login.tsx`, `frontend/src/components/app-sidebar.tsx`

**Login** (`login.tsx`)

```text
กรอกฟอร์ม → ตรวจด้วย Zod (loginSchema) → api("/users/login", { method: "POST", auth: false })
→ setAuth(data.token) → ไปหน้า "/"
```

**Logout** (`app-sidebar.tsx` → `handleLogout`)

```text
api("/users/logout", { method: "POST" }) → clear() → ถูกพาไปหน้า /login
```

**ต่อไป:** ต้องกันไม่ให้เข้าหน้าที่ไม่มีสิทธิ์ → ขั้น 7

---

## 7. Authentication / Authorization (Frontend)

**ไฟล์:** `frontend/src/layouts/root-layout.tsx`, `frontend/src/layouts/require-role.tsx` (ใช้ใน `frontend/src/main.tsx`)

| ไฟล์               | ตรวจอะไร                         | ไม่ผ่าน     |
| ------------------ | -------------------------------- | ----------- |
| `root-layout.tsx`  | มี token ไหม (Login แล้วหรือยัง) | ไป `/login` |
| `require-role.tsx` | role ตรงกับหน้านี้ไหม            | กลับ `/`    |

```text
/admin/*   → <RequireRole role="ADMIN" />
/student/* → <RequireRole role="STUDENT" />
```

> ตรงนี้กันแค่ "หน้าเว็บ" — การกันจริงอยู่ที่ Backend ขั้น 13–14

**ต่อไป:** Login ผ่านแล้ว โหลดข้อมูล → ขั้น 8

---

## 8. Initial Data Loading

**ไฟล์:** `frontend/src/layouts/root-layout.tsx` (ผู้เรียก), `frontend/src/lib/enrollment-store.ts` (ที่ประกาศ `getAll`)

**ทำอะไร:** เมื่อเข้าเว็บ (มี token) เรียก `getAll(role, studentId)` ครั้งเดียว

### `getAll()` มาจากไหน

`getAll` เป็น **action** (ฟังก์ชัน) ใน store `useEnrollmentStore` ที่สร้างด้วย **Zustand** — ไม่ใช่ของ component หน้าไหน

```ts
// frontend/src/lib/enrollment-store.ts
export const useEnrollmentStore = create<EnrollmentStore>()((set) => ({
  students: [], courses: [], enrollments: [],   // ← state (ข้อมูล)
  loading: false, error: null,
  getAll: async (role, studentId) => { ... },   // ← action (ฟังก์ชันเปลี่ยนข้อมูล)
  ...
}));
```

### ใครเรียก / เรียกเมื่อไร

`RootLayout` ดึง `getAll` ออกจาก store แล้วเรียกใน `useEffect`

```ts
// frontend/src/layouts/root-layout.tsx
const { loading, error, getAll, reset } = useEnrollmentStore();

useEffect(() => {
  if (token && role)
    getAll(role, studentId); // Login แล้ว → โหลดข้อมูล
  else reset(); // Logout แล้ว → ล้างข้อมูลของ user ก่อนหน้า
}, [token, role, studentId, getAll, reset]);
```

- `role`, `studentId` มาจาก `useAuthStore` (ขั้น 5) ซึ่งถอดจาก JWT
- เรียกตอนเข้าเว็บโดยมี token อยู่แล้ว, หลัง Login และเมื่อเปลี่ยน user
- เรียกซ้ำได้จากปุ่ม "ลองใหม่" ในแถบ error
- ใส่ `getAll` ใน dependency array ได้ เพราะ Zustand สร้างฟังก์ชันนี้ครั้งเดียว (reference ไม่เปลี่ยน) → effect ไม่วนเรียกซ้ำ

### ข้างในทำอะไร

```ts
// frontend/src/lib/enrollment-store.ts
getAll: async (role, studentId) => {
  set({ loading: true, error: null }); // ① ขึ้น "กำลังโหลดข้อมูล..."
  try {
    const studentsRequest = // ② เลือก API นักศึกษาตาม role
      role === "ADMIN"
        ? api("/students") //    ADMIN → ทุกคน
        : studentId //แต่ถ้าไม่ใช่  role === "ADMIN"
          ? api(`/students/${studentId}`).then((s) => [s]) // STUDENT → แค่ตัวเอง (ห่อเป็น array)
          : Promise.resolve([]);

    const [students, courses, enrollments] = await Promise.all([
      // ③ ยิง 3 request พร้อมกัน
      studentsRequest,
      api("/courses"),
      api("/enrollments"), //    Backend กรองให้ STUDENT เห็นแค่ของตัวเอง
    ]);

    set({
      // ④ แปลงรูปข้อมูลแล้วเก็บลง store
      students: students.map(fromApiStudent), //    emails: string[] → { address }[]
      courses: courses.map(toCourse), //    ตัด id / createdAt ทิ้ง
      enrollments: enrollments.map(fromApiEnrollment), // createdAt → enrolledAt
      loading: false,
    });
  } catch (err) {
    set({ loading: false, error: err.message }); // ⑤ พัง → แถบ error + ปุ่ม "ลองใหม่"
  }
};
```

- ② ต้องแยกตาม role เพราะ Backend ให้เฉพาะ ADMIN เรียก `GET /students` ได้
- ③ `Promise.all` ยิงพร้อมกันแล้วรอครบ (เร็วกว่ายิงทีละตัว) — ถ้าตัวใดตัวหนึ่ง error จะไปที่ `catch` ทันที

`getAll()` เรียก 3 API พร้อมกัน

| ข้อมูล       | ADMIN                        | STUDENT                                            |
| ------------ | ---------------------------- | -------------------------------------------------- |
| นักศึกษา     | `GET /students` (ทุกคน)      | `GET /students/:studentId` (ตัวเอง)                |
| วิชา         | `GET /courses`               | `GET /courses`                                     |
| การลงทะเบียน | `GET /enrollments` (ทั้งหมด) | `GET /enrollments` (Backend กรองให้เหลือของตัวเอง) |

- ระหว่างโหลด → "กำลังโหลดข้อมูลจาก Backend..."
- โหลดไม่สำเร็จ → แสดง error + ปุ่ม "ลองใหม่"

### เส้นทางข้อมูล

```text
RootLayout (useEffect)
   ↓ getAll(role, studentId)
enrollment-store.ts
   ↓ api() ×3              ← ขั้น 4 แนบ token ให้
Backend GET /students, /courses, /enrollments
   ↓ authenticateToken → checkRoles (ขั้น 13–14)
   ↓ { success, data }
set({ students, courses, enrollments })
   ↓
ทุกหน้าที่ใช้ useEnrollmentStore re-render (ขั้น 20)
```

> `getAll()` โหลด **ครั้งเดียวตอนเริ่ม** — หลังจากนั้น เพิ่ม / แก้ / ลบ / ลงทะเบียน จะไม่เรียก `getAll()` ซ้ำ แต่ใช้ `set(...)` แก้เฉพาะส่วนที่เปลี่ยน (ขั้น 19)

**ต่อไป:** ข้อมูลถูกเก็บใน store → ขั้น 9

---

## 9. Global Data Store

**ไฟล์:** `frontend/src/lib/enrollment-store.ts`

**ทำอะไร:** เก็บ `students, courses, enrollments` ไว้ที่เดียว ทุกหน้าอ่านจากที่นี่

| Function         | API                 | ใช้ในขั้น |
| ---------------- | ------------------- | --------- |
| `getAll()`       | GET 3 ตัว           | 8         |
| `enroll()`       | `POST /enrollments` | 10        |
| `addCourse()`    | `POST /courses`     | 11        |
| `updateCourse()` | `PUT /courses`      | 11        |
| `removeCourse()` | `DELETE /courses`   | 11        |

**ต่อไป:** แยกเป็น 2 ทางตาม role → ขั้น 10 / 11

---

## 10. Student Flow — `enroll()`

**ไฟล์:** `frontend/src/pages/student/enrollments.tsx`

```text
กด "ลงทะเบียนเรียน" → เลือกวิชา (แสดงเฉพาะวิชาที่ยังไม่ลง)
   ↓
handleEnroll() → enroll(studentId, courseId)
   ↓
POST /api/v3/enrollments  { studentId, courseId }   → ไปขั้น 12
```

> ADMIN ก็ใช้ `enroll()` เดียวกันที่ `frontend/src/pages/admin/enrollments.tsx` (ลงให้นักศึกษาคนไหนก็ได้)

---

## 11. Admin Flow — `addCourse()` / `updateCourse()` / `removeCourse()`

**ไฟล์:** `frontend/src/pages/admin/courses.tsx`, `frontend/src/components/courses/course-form-dialog.tsx`, `frontend/src/components/courses/course-table.tsx`, `frontend/src/lib/course-validation.ts`

| การกระทำ  | Component                             | ตรวจฟอร์ม (Frontend)   | เรียก                                |
| --------- | ------------------------------------- | ---------------------- | ------------------------------------ |
| เพิ่มวิชา | `CourseFormDialog`                    | `validateCourseForm()` | `addCourse()` → `POST /courses`      |
| แก้วิชา   | `CourseFormDialog course={...}`       | `validateCourseForm()` | `updateCourse()` → `PUT /courses`    |
| ลบวิชา    | `CourseTable` + `ConfirmDeleteButton` | — (มี dialog ยืนยัน)   | `removeCourse()` → `DELETE /courses` |

กฎตรวจฟอร์มวิชาฝั่ง Frontend (`course-validation.ts`)

- `courseId` ตัวเลข 6 หลัก และไม่ซ้ำ
- `courseTitle` 6–100 ตัวอักษร
- `instructors` อย่างน้อย 1 คน

ไม่ผ่าน → แสดง error ใต้ช่องทันที และ **ไม่ส่ง request** / ผ่าน → ไปขั้น 12

---

## 12. Backend API

**ไฟล์:** `backend/src/routes/enrollmentsRouters_v3.ts`, `backend/src/routes/coursesRouters_v3.ts`

ทุก route ผ่าน middleware ตามลำดับ **ขั้น 13 → 14** ก่อนเข้า handler

| Method | Endpoint              | ขั้น 13             | ขั้น 14          |
| ------ | --------------------- | ------------------- | ---------------- |
| POST   | `/api/v3/enrollments` | `authenticateToken` | `checkRoles`     |
| POST   | `/api/v3/courses`     | `authenticateToken` | `checkRoleAdmin` |
| PUT    | `/api/v3/courses`     | `authenticateToken` | `checkRoleAdmin` |
| DELETE | `/api/v3/courses`     | `authenticateToken` | `checkRoleAdmin` |

---

## 13. JWT Authentication — "เป็นใคร?"

**ไฟล์:** `backend/src/middlewares/authenMiddleware.ts` → `authenticateToken`

```text
อ่าน header  Authorization: Bearer <token>     ไม่มี → 401
   ↓
jwt.verify(token, JWT_SECRET)                 ผิด/หมดอายุ → 403
   ↓
req.user = { username, studentId, role }  → next()
```

---

## 14. Role Authorization — "ทำอะไรได้?"

**ไฟล์:** `backend/src/middlewares/checkRolesDBMiddleware.ts`, `backend/src/middlewares/checkRoleAdminDBMiddleware.ts`

| Middleware       | ผ่านเมื่อ                                                              | ไม่ผ่าน |
| ---------------- | ---------------------------------------------------------------------- | ------- |
| `checkRoles`     | user มีอยู่จริง (STUDENT หรือ ADMIN) และ token ยังอยู่ใน `user.tokens` | 401     |
| `checkRoleAdmin` | เป็น `ADMIN` และ token ยังอยู่ใน `user.tokens`                         | 401     |

ตรวจเพิ่มใน route ลงทะเบียน: STUDENT ส่ง `studentId` ที่ไม่ใช่ของตัวเอง → **403 Forbidden access**

---

## 15. Zod Validation

**ไฟล์:** `backend/src/libs/zodValidators.ts`

**ทำไมต้องตรวจซ้ำ:** Frontend ตรวจเพื่อให้ใช้งานง่าย แต่ใครก็ยิง API ตรงได้ → Backend ต้องตรวจเองเสมอ

| Route               | Schema            |
| ------------------- | ----------------- |
| `POST /enrollments` | `zEnrollmentBody` |
| `POST /courses`     | `zCoursePostBody` |
| `PUT /courses`      | `zCoursePutBody`  |
| `DELETE /courses`   | `zCourseId`       |

```text
safeParse(body)
   ├── ไม่ผ่าน → 400 { success: false, message: "Validation failed", errors }
   └── ผ่าน   → ขั้น 16
```

---

## 16. Prisma

**ไฟล์:** `backend/generated/prisma/client.ts` (สร้างจาก `schema.prisma` ด้วย `pnpm db:generate`)

ก่อนเขียนข้อมูล ตรวจกับฐานข้อมูลจริงก่อน แล้วจึงเขียน

| การกระทำ  | ตรวจก่อน                                                                                  | เขียน                                                  |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ลงทะเบียน | `student.findUnique` (404), `course.findUnique` (404), `enrollment.findFirst` ลงซ้ำ (409) | `enrollment.create`                                    |
| เพิ่มวิชา | `course.findFirst` รหัส/ชื่อซ้ำ (400)                                                     | `course.create`                                        |
| แก้วิชา   | `course.findUnique` (404), `course.findFirst` ชื่อซ้ำ (400)                               | `course.update`                                        |
| ลบวิชา    | `course.findUnique` (404)                                                                 | `$transaction([enrollment.deleteMany, course.delete])` |

---

## 17. MongoDB

**ไฟล์:** `backend/prisma/schema.prisma`

| Model        | Collection    | Field หลัก                                                                 |
| ------------ | ------------- | -------------------------------------------------------------------------- |
| `User`       | `Users`       | `username`, `password` (bcrypt), `role`, `studentId?`, `tokens[]`          |
| `Student`    | `Students`    | `studentId`, `firstName`, `lastName`, `program`, `interests[]`, `emails[]` |
| `Course`     | `Courses`     | `courseId`, `courseTitle`, `instructors[]`                                 |
| `Enrollment` | `Enrollments` | `studentId` → Student, `courseId` → Course                                 |

```text
Student 1 ─── * Enrollment * ─── 1 Course
```

---

## 18. Response

**Backend ตอบกลับ** (รูปแบบเดียวกันทุก route)

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "...", "errors": "..." }
```

**Frontend รับที่** `frontend/src/lib/api.ts`

| สถานการณ์                               | `api()` ทำอะไร                                     |
| --------------------------------------- | -------------------------------------------------- |
| สำเร็จ                                  | คืน `data`                                         |
| 400 / 404 / 409 / 500                   | `throw ApiError(ข้อความจาก Backend)` → แสดงในฟอร์ม |
| 401 / 403                               | `clear()` (Logout อัตโนมัติ) → ไป `/login`         |
| เชื่อมต่อไม่ได้ (Backend ไม่รัน / CORS) | `"เชื่อมต่อ Backend ไม่ได้"`                       |

---

## 19. Update Store

**ไฟล์:** `frontend/src/lib/enrollment-store.ts`

เมื่อสำเร็จ แก้ state ใน store ทันที (ไม่ต้องโหลดใหม่ทั้งหมด)

| Function         | อัปเดต                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `enroll()`       | เพิ่ม enrollment ใหม่ต่อท้าย `enrollments`                              |
| `addCourse()`    | เพิ่มวิชาต่อท้าย `courses`                                              |
| `updateCourse()` | แทนที่วิชาที่ `courseId` ตรงกัน                                         |
| `removeCourse()` | ลบวิชาออกจาก `courses` และลบ enrollment ของวิชานั้นออกจาก `enrollments` |

---

## 20. React UI Update

ทุกหน้าที่อ่านข้อมูลจาก `useEnrollmentStore` จะ re-render เอง เช่น

- ลงทะเบียนเสร็จ → ตารางในหน้า `student/enrollments.tsx` มีวิชาใหม่ และ dialog ปิด
- ADMIN เพิ่มวิชา → `course-table.tsx` มีแถวใหม่ และวิชาไปโผล่เป็นตัวเลือกในหน้าลงทะเบียนทันที
- ถ้า error → ข้อความสีแดงในฟอร์ม (`serverError`) หรือใต้ตาราง (`deleteError`)

---

## สรุป Status Code ที่ใช้จริง

| Code      | ความหมาย                                                      | เกิดที่             |
| --------- | ------------------------------------------------------------- | ------------------- |
| 200 / 201 | สำเร็จ / สร้างใหม่สำเร็จ                                      | route ต่าง ๆ        |
| 400       | ข้อมูลไม่ผ่าน Zod หรือข้อมูลซ้ำ                               | ขั้น 15, 16         |
| 401       | ไม่มี token, รหัสผ่านผิด, ไม่ใช่ ADMIN, token ถูก Logout แล้ว | ขั้น 3, 13, 14      |
| 403       | token ผิด/หมดอายุ, STUDENT ทำแทนคนอื่น                        | ขั้น 13, 14         |
| 404       | ไม่พบข้อมูล / ไม่พบ endpoint                                  | ขั้น 16, 2          |
| 409       | ลงทะเบียนวิชาซ้ำ                                              | ขั้น 16             |
| 500       | Server error                                                  | ทุก route (`catch`) |

---

## ตารางไฟล์ทั้งหมด

| ขั้น | ไฟล์                                                     | Function / Component                                                |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | `backend/.env`, `frontend/.env`                          | —                                                                   |
| 2    | `backend/src/index.ts`                                   | `cors`, `app.use(...)`                                              |
| 3    | `backend/src/routes/usersRouters_v3.ts`                  | `POST /login`, `POST /logout`                                       |
| 3    | `backend/src/utils/compare.ts`                           | `comparePassword`                                                   |
| 4    | `frontend/src/lib/api.ts`                                | `api()`, `http`, `ApiError`                                         |
| 5    | `frontend/src/lib/auth-store.ts`                         | `useAuthStore`, `setAuth`, `clear`                                  |
| 6    | `frontend/src/pages/login.tsx`                           | `LoginPage`, `onSubmit`                                             |
| 6    | `frontend/src/components/app-sidebar.tsx`                | `handleLogout`                                                      |
| 7    | `frontend/src/layouts/root-layout.tsx`                   | `RootLayout` (เช็ก token)                                           |
| 7    | `frontend/src/layouts/require-role.tsx`                  | `RequireRole`                                                       |
| 8    | `frontend/src/layouts/root-layout.tsx`                   | `useEffect` → `getAll()`                                            |
| 9    | `frontend/src/lib/enrollment-store.ts`                   | `useEnrollmentStore`                                                |
| 10   | `frontend/src/pages/student/enrollments.tsx`             | `handleEnroll` → `enroll()`                                         |
| 11   | `frontend/src/components/courses/course-form-dialog.tsx` | `handleSubmit` → `addCourse()` / `updateCourse()`                   |
| 11   | `frontend/src/components/courses/course-table.tsx`       | `handleDelete` → `removeCourse()`                                   |
| 11   | `frontend/src/lib/course-validation.ts`                  | `validateCourseForm`                                                |
| 12   | `backend/src/routes/enrollmentsRouters_v3.ts`            | `router.post("/")`                                                  |
| 12   | `backend/src/routes/coursesRouters_v3.ts`                | `router.post/put/delete("/")`                                       |
| 13   | `backend/src/middlewares/authenMiddleware.ts`            | `authenticateToken`                                                 |
| 14   | `backend/src/middlewares/checkRolesDBMiddleware.ts`      | `checkRoles`                                                        |
| 14   | `backend/src/middlewares/checkRoleAdminDBMiddleware.ts`  | `checkRoleAdmin`                                                    |
| 15   | `backend/src/libs/zodValidators.ts`                      | `zEnrollmentBody`, `zCoursePostBody`, `zCoursePutBody`, `zCourseId` |
| 16   | `backend/generated/prisma/client.ts`                     | `PrismaClient`                                                      |
| 17   | `backend/prisma/schema.prisma`                           | `User`, `Student`, `Course`, `Enrollment`                           |
| 18   | `frontend/src/lib/api.ts`                                | `api()` จัดการ response / error                                     |
| 19   | `frontend/src/lib/enrollment-store.ts`                   | `set(...)` ใน `enroll`, `addCourse`, `updateCourse`, `removeCourse` |
| 20   | `frontend/src/pages/*`, `frontend/src/components/*`      | re-render จาก store                                                 |

---
