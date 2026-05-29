import { Router, Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Use memory storage — upload buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL,
});

router.post(
  "/logo",
  authenticateJWT,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "milkyway/logos",
            resource_type: "image",
            transformation: [{ width: 256, height: 256, crop: "fill", quality: "auto" }],
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"));
            else resolve(result as { secure_url: string });
          }
        );
        stream.end(req.file!.buffer);
      });

      return res.json({ url: result.secure_url });
    } catch (err: any) {
      console.error("Cloudinary upload error:", err.message);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
