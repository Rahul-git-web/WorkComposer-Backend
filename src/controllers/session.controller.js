import mongoose from "mongoose";
import Session from "../models/session.models.js";

//Create Session
export const createSession = async (req, res) => {
  try {
    const { startTime, endTime, duration, type } = req.body;

    if (!startTime || !endTime || !duration) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const session = await Session.create({
      userId: req.user._id,
      startTime,
      endTime,
      duration,
      type,
      date: new Date(startTime).toISOString().split("T")[0],
    });

    console.log("SESSION SAVED:", session);

    res.status(201).json(session);
  } catch (err) {
    console.log("CREATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

//Get Sessions By Date
export const getSessions = async (req, res) => {
  try {
    const { date } = req.query;

    let query = {
      userId: req.user._id,
    };

    if (date) {
      query.date = date;
    }

    const sessions = await Session.find(query);

    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};


// =========================
// DELETE SESSIONS IN RANGE
// =========================
export const deleteSessionsInRange = async (req, res) => {
  let mongoSession;

  try {
    const { startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    //  Validation
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start and End time required" });
    }

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start >= end) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    mongoSession = await mongoose.startSession();
    await mongoSession.startTransaction();

    //  Find ALL overlapping sessions
    const sessions = await Session.find({
      userId: req.user._id,
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).session(mongoSession);

    let workTime = 0;
    let breakTime = 0;
    let deletedCount = 0;
    let modifiedCount = 0;
    let screenshots = 0;

    for (const s of sessions) {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);

      // Overlap calculation
      const overlapStart = new Date(Math.max(sStart, start));
      const overlapEnd = new Date(Math.min(sEnd, end));

      const overlapSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000)
      );

      if (s.type === "work") workTime += overlapSeconds;
      if (s.type === "break") breakTime += overlapSeconds;

      screenshots += s.screenshots || 0;

      // -----------------------------
      // CASE 1: Fully inside → delete
      // -----------------------------
      if (sStart >= start && sEnd <= end) {
        await Session.deleteOne({ _id: s._id }).session(mongoSession);
        deletedCount++;
      }

      // -----------------------------
      // CASE 2: Cut right side
      // -----------------------------
      else if (sStart < start && sEnd > start && sEnd <= end) {
        s.endTime = start;
        s.duration = Math.floor((start - sStart) / 1000);
        await s.save({ session: mongoSession });
        modifiedCount++;
      }

      // -----------------------------
      // CASE 3: Cut left side
      // -----------------------------
      else if (sStart >= start && sStart < end && sEnd > end) {
        s.startTime = end;
        s.duration = Math.floor((sEnd - end) / 1000);
        await s.save({ session: mongoSession });
        modifiedCount++;
      }

      // -----------------------------
      // CASE 4: Split into two
      // -----------------------------
      else if (sStart < start && sEnd > end) {
        const firstPart = {
          userId: s.userId,
          startTime: sStart,
          endTime: start,
          duration: Math.floor((start - sStart) / 1000),
          type: s.type,
          team: s.team,
          date: new Date(sStart).toISOString().split("T")[0],
        };

        const secondPart = {
          userId: s.userId,
          startTime: end,
          endTime: sEnd,
          duration: Math.floor((sEnd - end) / 1000),
          type: s.type,
          team: s.team,
          date: new Date(end).toISOString().split("T")[0],
        };

        await Session.deleteOne({ _id: s._id }).session(mongoSession);
        await Session.insertMany([firstPart, secondPart], {
          session: mongoSession,
        });

        deletedCount++;
      }
    }

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return res.json({
      message: "Deleted successfully",
      deletedCount,
      modifiedCount,
      workTime,
      breakTime,
      screenshots,
    });

  } catch (err) {
    if (mongoSession) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
    }

    return res.status(500).json({
      error: err.message,
    });
  }
};



// =========================
// PREVIEW SESSIONS IN RANGE
// =========================
export const previewSessionsInRange = async (req, res) => {
  try {
    const { startTime, endTime } = req.query;

    // Validation
    if (!startTime || !endTime) {
      return res.status(400).json({
        error: "Start time and end time are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        error: "Invalid date format",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: "Start time must be before end time",
      });
    }

    // Same logic as delete (IMPORTANT)
    const sessions = await Session.find({
      userId: req.user._id,
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).lean();

    let workTime = 0;
    let breakTime = 0;
    let screenshots = 0;

    sessions.forEach((s) => {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);

      const overlapStart = new Date(Math.max(sStart, start));
      const overlapEnd = new Date(Math.min(sEnd, end));

      const overlapSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000)
      );

      if (s.type === "work") workTime += overlapSeconds;
      if (s.type === "break") breakTime += overlapSeconds;

      screenshots += s.screenshots || 0;
    });

    return res.status(200).json({
      workTime,
      breakTime,
      screenshots,
      sessionsCount: sessions.length,
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};
