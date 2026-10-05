// ขั้นที่ 2 — Backend Configuration
// สร้าง Express app, เปิด CORS ให้ Frontend (:5173) เรียกได้, ผูก router ทุกตัวไว้ใต้ /api/v3
// ค่า PORT / CORS_ORIGIN / JWT_SECRET / DATABASE_URL อ่านจาก backend/.env (ขั้นที่ 1)
import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
dotenv.config();

// import middlewares
import morgan from "morgan";
import cors from "cors";
import invalidJsonMiddleware from "./middlewares/invalidJsonMiddleware.ts";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.ts";

// Check DB connection
import { checkDatabaseConnection } from "./libs/checkDbConnection.ts";
checkDatabaseConnection();

// import routers
import studentRouter_v3 from "./routes/studentsRoutes_v3.ts";
import courseRouter_v3 from "./routes/coursesRouters_v3.ts";
import userRouter_v3 from "./routes/usersRouters_v3.ts";
import fileRouter_v1 from "./routes/fileRouters_v1.ts";
import enrollmentRouter_v3 from "./routes/enrollmentsRouters_v3.ts";

const app = express();
const port = process.env.PORT || 3000;

// ขั้นที่ 2 — CORS ต้องอยู่ก่อน express.json() และก่อนผูก router ทุกตัว
// CORS middleware: อนุญาตให้ Frontend (Vite dev server คนละ origin) เรียก API ได้
// ตั้งค่า origin ได้หลายค่าคั่นด้วย "," ผ่าน CORS_ORIGIN ใน .env
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

// logger middleware
app.use(morgan("dev"));
// app.use(morgan("combined"));

// JSON parser middleware
app.use(invalidJsonMiddleware);

// Endpoints
app.get("/", (req: Request, res: Response) => {
  res.send("Lecture10 API services");
});

app.get("/me", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Student Information",
    data: {
      studentId: "600610999",
      firstName: "Dome",
      lastName: "Potikanond",
      program: "CPE",
      section: "001",
    },
  });
});

// use routers — ขั้นที่ 2: ทุก API ขึ้นต้นด้วย /api/v3 (ตรงกับ VITE_API_URL ฝั่ง Frontend)
app.use("/api/v3/users", userRouter_v3);
app.use("/api/v3/students", studentRouter_v3);
app.use("/api/v3/courses", courseRouter_v3);
app.use("/api/v3/file", fileRouter_v1);
app.use("/api/v3/enrollments", enrollmentRouter_v3);

// endpoint check middleware — route ที่ไม่มีจริง → 404
app.use(notFoundMiddleware);

// หากไม่ใช่ Vercel (ไม่ได้อยู่บน Production) ถึงจะสั่ง app.listen
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

// Export app for vercel deployment
export default app;
