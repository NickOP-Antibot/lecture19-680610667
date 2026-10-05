// ./src/routes/fileRouter_v1.ts

import express, {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

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

// Serve the "uploads" folder statically so users can view file
// GET /api/v3/file/view/:filename - Endpoint to access specific file
router.use("/view", express.static(uploadDir));

// Insert endpoints' logic below
// POST /api/v3/file/upload - Endpoint to handle file upload
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

    console.log(filename, studentId);
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

// GET /api/v3/file/:studentId - Endpoint to get student files
router.get("/:studentId", async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId as string;

    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: "Student ID is required as parameter in URL" 
      });
    }

    const files = await prisma.file.findMany({
      where: { studentId: studentId}
    });

    if (!files) {
      return res.status(404).json({
        success: false,
        message: "Student ID does not have any files."
      });
    }

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

// DELETE /api/v3/file/:filename - Endpoint to delete a specific file by name
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

// Global Error Handler for handling Multer/Upload issues
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({ error: err.message });
});

export default router;