import express from "express";
import Timer from "../models/timer.model.js";

const router = express.Router();

// GET ACTIVE TIMER
router.get("/active", async (req, res) => {
  try {
    const timer = await Timer.findOne({
      status: "running",
    })
      .populate("project", "name")
      .populate("task", "title");

    res.status(200).json(timer);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get("/active/:userId", async (req, res) => {
  try {
    const timer = await Timer.findOne({
      user: req.params.userId,
      status: "running",
    })
      .populate("project", "name")
      .populate("task", "title");

    res.json(timer);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

export default router;
