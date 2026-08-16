import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  saveLocation,
  getLocations,
} from "../controllers/location.controller.js";

const router = express.Router();

router.post("/", protect, saveLocation);

router.get("/", protect, getLocations);

export default router;