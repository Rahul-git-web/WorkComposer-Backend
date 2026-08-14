import express from "express";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";
import { exportScreenshotsZip, getScreenshots, getUserScreenshots, uploadScreenshot } from "../controllers/screenshot.controller.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post("/upload", protect, upload.single("screenshot"), uploadScreenshot);
router.get("/", protect, getScreenshots);
router.get("/export-zip", protect, exportScreenshotsZip);
router.get("/:userId", protect, getUserScreenshots);

export default router;
