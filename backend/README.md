# Lecture 10 - RESTful API (Part 4)

## Content

- [MongoDB Atlas](https://www.mongodb.com/products/platform/cloud)
- Prisma ORM
- File Uploading

---

## Current API

**Route Handlers**

- `/api/v2/students` : CRUD API for Students data (in-memory DB)
- `/api/v3/students` : CRUD API for Students data (JSON file)
- `/api/v2/courses` : CRUD API for Courses data (in-memory DB) **NOT DONE!!**

**Middlewares**

- `express.json()`: extract and parsing JSON from request's body
- `morgan("dev")`: request logging
- `invalidJsonMiddleware`: check invalid JSON format in request's body
- `notFoundMiddleware` : check if endpoint/routes do not exist?
- `authenticateToken` : authenticates `JWT token` and extracts `UserPayload` (`{username, studentId, role}`) then create `CustomRequest`.
- `checkRoleAdmin` : check if the authenticated request is from a user with `ADMIN` role

**TypeScript interfaces**

Interface for main data are defined in `src/libs/types.ts`:

- `Student`
- `Course`
- `Enrollment`
- `User`
- `CustomRequest` : Customized `Request` Object
- `UserPayload` : A payload containing authenticated user data extracted by middleware

**JSON file**

Files that stores persistent data. (Not working in Vercel)

- `src/db/db_courses.json`
- `src/db/db_students.json`

In this lab we will create a `database` from those JSON files.

---

## Packages for this lab

```bash
# dependencies
pnpm i @prisma/client@6.19 multer

# development dependencies
pnpm i -D prisma@6.19 @types/multer

# approve post installation scripts
pnpm approve-builds
? Choose which packages to build (Press <space> to select, <a> to toggle all, <i> to invert selection)
 ● @prisma/engines
❯● prisma
```

**Package explanation:**
- `@prisma/client@6.19` : Prisma v6.19 ORM's generated query builder.
- `multer` : a middleware for handling `multipart/form-data`, used for uploading files.
- `prisma@6.19` : Prisma v6.19 CLI tools.

**Note:** Currently, the latest `prisma` version that supports MongoDB is `6.19`.

---

## Update `package.json` file.

First, we may want to add a few lines in the `scripts` section.

```json
...
"scripts": {
    ...
    "db:generate": "pnpm exec prisma generate",
    "db:push": "pnpm exec prisma db push"
  },
  ...
```

We will use those scripts to run the following commands later on.

```bash
// Creates PrismaClient object for database connection
pnpm run db:generate

// Syncing Prisma schema with the target database (MongoDB)
pnpm run db:push
```

---

## Prisma ORM

### Initialize Prisma ORM

Initialize Prisma with the following command. This command creates a `prisma` directory with a `prisma/schema.prisma` file.

```bash
pnpm exec prisma init
```

This creates the following files and folder:
- `./prisma/schema.prisma` : defines schema of our database, we will update this file later
- `./prisma.config.ts` : Prisma configuration for this project. This file injects the `DATABASE_URL` variable from `.env` into the project.

```typescript
// ./prima.config.ts
import "dotenv/config"; 
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

### Define database schema

Creates database schema for your application in the `./prisma/schema.prisma` file. We will create several collections in the MongoDB database.

```prisma
// ./prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// 🧩 Model: Student
// =======================
model Student {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId String   @unique
  firstName String
  lastName  String
  program   String
  programId Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  enrollments Enrollment[] // Virtual back-relation: A user can have multiple enrollments
  files       File[] // Virtual back-relation: A user can have multiple files

  @@map("Students")
}

// 🧩 Model: Course
// =======================
model Course {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  courseId    String   @unique
  courseTitle String
  instructors String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  enrollments Enrollment[] // Virtual back-relation: A course can have multiple enrollments

  @@map("Courses")
}

// 🧩 Model: Enrollment
// =======================
model Enrollment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId String // relation field
  student   Student  @relation(fields: [studentId], references: [studentId])
  courseId  String // relation field
  course    Course   @relation(fields: [courseId], references: [courseId])
  grade     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("Enrollments")
}

enum Role {
  STUDENT
  ADMIN
}

// 🧩 Model: User
// =======================
model User {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  username  String   @unique
  password  String
  studentId String?
  role      Role     @default(STUDENT)
  tokens    String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("Users")
}

// 🧩 Model: File
// =======================
model File {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  fileName  String   @unique
  studentId String // relation field
  student   Student  @relation(fields: [studentId], references: [studentId])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("Files")
}
```

### Create a database in MongoDB Atlas

1. Get a `connection string` from MongoDB Atlas for using with [Mongo Compass](https://www.mongodb.com/try/download/compass)

```
mongodb+srv://<db_username>:<db_password>@<mongo_server>
```

2. Connect to MongoDB Atlas using Mongo Compass
3. Create a new database, `lab10`.

### Connect to MongoDB database from your App

Create `DATABASE_URL` variable in `.env` file and configures its value as the MongoDB Atlas `connection string`.

```bash
DATABASE_URL=mongodb+srv://<db_username>:<db_password>@<mongo_server>/<database_name>?retryWrites=true&w=majority&appName=Cluster0
```

### Sync database schema

Next step is to generate the `Prisma Client` object with the following command. This command reads your schema and generate a type-safe database client (`PrismaClient`) in the `node_modules` directory.

```bash
# create a prisma client object
pnpm run db:generate
```

Finally, we can sync the database schema (`prisma/schema.prisma`) with the database (MongoDB Atlas) with this command.

```bash
# connect to the database using connection string
# create collections according to prisma schema
pnpm run db:push
```

### Import database from JSON file

Now we can import intial database content from JSON files using [MongoDB Compass](https://www.mongodb.com/try/download/compass).

Select your <database>/<collection> and click `import` and select your JSON file.

- `./src/db/db_courses.json`
- `./src/db/db_students.json`
- `./src/db/db_users.json`

Browse and refresh your database again, you should see the imported data.

---

### Check database connection with Express

Creates a file `./src/libs/checkDbConnection.ts` with the following code.

```typescript
// import PrismClient 
import { PrismaClient } from '../../generated/prisma/client.ts';

const prisma = new PrismaClient();

export async function checkDatabaseConnection() {
  try {
    // Forces Prisma Client to establish a connection with the database
    await prisma.$connect();
    console.log('✅ Successfully connected to the database.');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Handle error (e.g., exit process, trigger alerts)
    process.exit(1);
  } finally {
    // Always disconnect after a manual health check script to free up the pool
    await prisma.$disconnect();
  }
}
```

Import and use `checkDatabaseConnection()` when API starts. Add these code in `./src/index.ts`.

```typescript
// Check DB connection
import { checkDatabaseConnection } from "./libs/checkDbConnection.ts";
checkDatabaseConnection();
```

When the API starts and able to connect to the database, we should see a message `✅ Successfully connected to the database.`.

---

## Endpoints - Create and use routers

Create routers for different endpoints in the following files:

- `./src/routes/usersRouters_v3.ts`: for `/api/v3/users` endpoints
- `./src/routes/studentsRouters_v3.ts`: for `/api/v3/students` endpoints
- `./src/routes/coursesRouters_v3.ts`: for `/api/v3/courses` endpoints
- `./src/routes/fileRouters_v3.ts`: for `/api/v3/file` endpoints

In `./src/index.ts`, import and use all the routers.

```typescript
// import routers
import studentRouter_v3 from "./routes/studentsRoutes_v3.ts";
import courseRouter_v3 from "./routes/coursesRouters_v3.ts";
import userRouter_v3 from "./routes/usersRouters_v3.ts";
import fileRouter_v1 from "./routes/fileRouters_v1.ts";

...

// use routers
app.use("/api/v3/users", userRouter_v3);
app.use("/api/v3/students", studentRouter_v3);
app.use("/api/v3/courses", courseRouter_v3);
app.use('/api/v3/file',fileRouter_v1);  
```

---

### Endpoints - `/api/v3/users`

In `./src/routes/usersRouters_v3.ts`, write code for the following endpoints.

#### `POST /api/v3/users/login` - Login

```typescript
// Password utility functions
import { comparePassword } from "../utils/compare.ts";
import { hashPassword } from "../utils/hash.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

router.post("/login", async (req: Request, res: Response) => {
  try {
    // get username and password from body
    const { username, password } = req.body;
    // get a user from DB by username
    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    // if user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // found a user, compare passwords
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // create jwt token
    const jwt_secret = process.env.JWT_SECRET || "this_is_my_secret";
    const token = jwt.sign(
      {
        // create JWT Payload
        username: user.username,
        studentId: user.studentId,
        role: user.role,
      },
      jwt_secret,
      { expiresIn: "30m" }
    );

    // store the new token in user.tokens
    user.tokens = user.tokens ? [...user.tokens, token] : [token];

    // update user.tokens in the DB
    const updatedUser = await prisma.user.update({
      where: {
        username: user.username,
      },
      data: {
        tokens: user.tokens,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        username: user.username,
        tokens: user.tokens,
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});
```

#### `POST /api/v3/users/logout` - Logout

Delete all user `tokens` if logout successfully.

```typescript
// POST /api/v3/users/logout
router.post("/logout", authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const payload = req.user;
    const token = req.token;
    // get a user from DB by username from payload
    const user = await prisma.user.findUnique({
      where: {
        username: payload?.username,
      },
    });

    // if user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // delete all tokens by setting array size = 0
    user.tokens.length = 0;

    // update user.tokens on DB
    const updatedUser = await prisma.user.update({
      where: { username: user.username },
      data: { tokens: user.tokens }
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
      data: updatedUser
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});
```

#### `POST /api/v3/users` - Create a user

Only `ADMIN` can use this endpoint.

```typescript
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin, 
  async(req:CustomRequest, res:Response) => {
  try {
    // get new user information from req.body
    const body = (await req.body) as User;

    // validate req.body with predefined validator
    const result = zUserBody.safeParse(body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    // get user with specified username OR studentId from DB
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {username: body.username},
          {studentId: body.studentId}
        ]
      },
    });

    // if username OR studentId is already taken
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Username or StudentID is already taken.",
      });
    }

    // if no user found, 
    // create new user with encrypted password
    const new_user:User = {
      username: body.username,
      password: await hashPassword(body.password,10),
      studentId: body.studentId ? body.studentId:null,
      role: body.role
    };
    // add new user to DB
    const created = await prisma.user.create({ data: new_user as any });

    // add response header 'Link'
    res.set("Link", `/api/v3/users/${created.id}`);

    return res.status(201).json({
      success: true,
      data: created,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});
```

#### `DELETE /api/v3/users` - Delete specified user

Only `ADMIN` can use this endpoint.

```typescript
router.delete("/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      // get username to delete from req.body
      const username = req.body.username as string;
      
      // check if the user does exist
      const user = await prisma.user.findUnique({
        where: { username: username}
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User ${username} not found.`
        })
      }

      // found user, delete the user from DB
      const deletedUser = await prisma.user.delete({
        where: { username: username }
      });

      res.status(200).json({
        success: true,
        message: `User ${username} was deleted successfully.`,
        data: deletedUser
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
```

#### `GET /api/v3/users/:userId` - Get specified user

Only `ADMIN` and `STUDENT` who own the user data can use this endpoint. 

```typescript
router.get(
  "/:userId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      // get user, token from CustomRequest (token payload)
      const user = req.user;
      const token = req.token;

      // get parameterized variable: userId (ObjectId)
      const userId = req.params.userId as string;
      let found_user = null;

      if (userId) {
        // get user from DB by ObjectId
        found_user = await prisma.user.findUnique({
          where:  {
            id: userId,
          },
        });
      }
      
      // STUDENT token? AND token's owner try to access other student data?
      if (user?.role === 'STUDENT' && found_user?.studentId !== user?.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      // ADMIN token OR token's owner access his own data
      return res.json({
        success: true,
        data: found_user,
      });
      
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
```

#### `GET /api/v3/users` - Get all users

Only `ADMIN` can use this endpoint.

```typescript
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,       // only all ADMIN access
  async (req: Request, res: Response) => {
    try {
      const found_users = await prisma.user.findMany();
      
      // return all users
      return res.json({
        success: true,
        data: found_users,
      });
      
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
```

---

### Endpoints - `/api/v3/students`

In `./src/routes/studentsRouters_v3.ts`, write code for the following endpoints.

#### `GET /api/v3/students` - Get students (by program)

Only `ADMIN` can use this endpoing.

```typescript
// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: Request, res: Response) => {
  
    try {
      // get students from DB
      const students = await prisma.student.findMany();

      // get program name from query string (if any)
      const program = req.query.program;
      if (program) {
        // filter students by program
        let filtered_students = students.filter(
          (student) => student.program === program
        );
        return res.json({
          success: true,
          data: filtered_students,
        });

      } else {
        // return all students
        return res.json({
          success: true,
          data: students,
        });
      }
    } catch (err) {
      return res.json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
});
```

#### `GET /api/v3/students/:studentId` - Get student by studentId

Only `ADMIN` and `Student` who owns the data can use this endpoing.

```typescript
router.get(
  "/:studentId", 
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
  try {
    // get user, token from CustomRequest (token payload)
    const user = req.user;
    const token = req.token;

    // get parameterized variable: studentId
    const studentId = req.params.studentId as string;
    // validate studentId
    const result = zStudentId.safeParse(studentId);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues[0]?.message,
      });
    }

    let found_student = null;
    if (studentId) {
      // get student from DB by studentId
      found_student = await prisma.student.findUnique({
        where: { studentId: studentId }
      });
    }

    // if student is not found
    if (!found_student) {
      return res.status(404).json({
        success: false,
        message: "Student does not exists",
      });
    }

    // if STUDENT does not own the data
    if (found_student.studentId !== user?.studentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    res.json({
      success: true,
      data: found_student
    });

  } catch (err) {
    return res.json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
```

#### `POST /api/v3/students`

Only `ADMIN` can use this endpoint.

```typescript
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin, 
  async (req: CustomRequest, res: Response) => {
    try {
      // get new student info from req.body
      const body = (await req.body) as Student;

      // validate req.body with predefined validator
      const result = zStudentPostBody.safeParse(body); // check zod
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      //check if the studentId exists in DB
      const student = await prisma.student.findUnique({
        where: { studentId: body.studentId}
      });
      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      // add new student and write to DB
      const new_student = body;
      const created = await prisma.student.create({
        data: new_student as any
      });

      // add response header 'Link'
      res.set("Link", `/api/v3/students/${created.studentId}`);

      return res.status(201).json({
        success: true,
        data: created,
      });
      
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Somthing is wrong, please try again",
        error: err,
      });
    }
});
```
---

### File Uploading

For this feature, we can use `multer` package. `multer` is a middleware for handling `multipart/form-data`. It is primarily used for uploading files

Install package dependencies:

```bash
pnpm install multer
pnpm install -D @types/multer
```

Create a directory in your project's root to store the uploaded files.

```bash
// for PowerShell
md uploads

// for macOS and Linux
mkdir uploads
```

#### Create `file` endpoints.

In the file `./src/routes/fileRouters_v1.ts`

Creates a `multer` configuration
- Storage directory location
- Filename pattern
- File type filter

```typescript
...
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload directory exists locally
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 1. Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique timestamped file name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// 2. Filter files to allow only images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("application/pdf")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and pdf files are allowed!"));
  }
};

const upload = multer({
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
 });
...

```

#### `POST /api/v3/file/upload` - File upload

We use `upload.single("file")` as a `middleware` to handle a single file upload from a field name `file`.

```typescript
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Please select an image file to upload." });
    }

    const studentId = req.body.studentId;
    const filename = req.file.filename;

    // check if studentId does exist
    const student = await prisma.student.findUnique({
      where: { studentId: studentId as string}
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "StudentID not found",
      });
    }

    // add filename to database
    const created = await prisma.file.create({
      data: {
        fileName: filename,
        studentId: studentId
      }
    });

    // Construct a public view URL for the client
    const fileUrl = `${req.protocol}://${req.get("host")}/api/v3/file/view/${filename}`;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully!",
      data: created,
      size: req.file.size,
      url: fileUrl,
    });
  },
);
```

#### `GET /api/v3/file/view/:filename` - View file

We use `express.static(uploadDir)` middleware to serve file directly from upload folder.

```typescript
router.use("/view", express.static(uploadDir));
```

#### `GET /api/v3/file/:studentId` - Get files by studentId

```typescript
router.get("/:studentId", async (req: Request, res: Response) => {
  try {
    // get parameterized variable: studentId
    const studentId = req.params.studentId as string;
    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: "Student ID is required as parameter in URL" 
      });
    }

    // get files by studentId
    const files = await prisma.file.findMany({
      where: { studentId: studentId}
    });
    if (!files) {
      return res.status(404).json({
        success: false,
        message: "Student ID does not have any files."
      });
    }

    // create response data
    const files_data = files.map((f) => { 
      return {
        fileName: f.fileName,
        fileUrl: `${req.protocol}://${req.get("host")}/api/v3/file/view/${f.fileName}`,
        createdAt: f.createdAt
      }
    });

    return res.status(200).json({
      success: true,
      message: `Get files for ${studentId} successfully.`,
      data: files_data
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Something is wrong, unable to process your request.'
    })
  }
});
```

#### `DELETE /api/v3/file/:filename` - Delete file by filename

```typescript
router.delete("/:filename", (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename as string;
    console.log(filename);

    if (!filename) {
      res.status(400).json({ 
        success: false,
        error: "Filename is required as parameter in URL" 
      });
      return;
    }

    // Security check: Prevent directory traversal attacks (e.g., "../../etc/passwd")
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);
    console.log(filePath);

    // Verify file path belongs to the directory and exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ 
        success: false,
        error: "File not found" 
      });
      return;
    }

    fs.unlink(filePath, async (err) => {
      if (err) {
        res.status(500).json({ error: "Failed to delete file" });
        return;
      }

      const deleted = await prisma.file.delete({
        where: { fileName: safeFilename},
      });

      res.status(200).json({ 
        success: true,
        message: `File ${safeFilename} was deleted successfully`,
        data: deleted 
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Something is wrong, unable to process your request.'
    })
  }
});
```

---

### Endpoints - `/api/v3/students` with files

In `./src/routes/studentsRouters_v3.ts`, edit code for the following endpoints.

#### `GET /api/v3/students` - Get students (by program) with files

Use `fileMany()` with `include: { files: true }`. 

```typescript
...
  // get students from database
  // const students = await prisma.student.findMany();
  const students = await prisma.student.findMany({
    include: { files: true}
  });
...

```

This allows prisma to get students data with their `files` records. 