import express from "express";

import { apiKeyAuth } from "../../middleware/apiKeyAuth.js";
import { apiLogger } from "../../middleware/apiLogger.js";
import { getProjects } from "../../controllers/api/projectApiController.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

const router = express.Router();

router.use(apiKeyAuth);
router.use(apiLogger);

router.get("/projects", requirePermission("manage_settings"), getProjects);
// router.post("/tasks", createTask);

export default router;
