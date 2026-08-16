import { Server } from "socket.io";
import Timer from "../models/timer.model.js";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import ProjectTracking from "../models/projectTracking.model.js";
import { updateSyncStatus } from "../utils/updateSyncStatus.js";
import jwt from "jsonwebtoken";
import { checkDailyWarning } from "../services/emailReport.service.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

 io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return next(new Error("Invalid token"));
    }

    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("organization");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (err) {
    console.error("SOCKET AUTH ERROR:", err.message);

    if (err.name === "TokenExpiredError") {
      return next(new Error("TOKEN_EXPIRED"));
    }

    return next(new Error("Unauthorized"));
  }
});

  io.on("connection", (socket) => {
    console.info("Socket connected:", socket.id);

    socket.on("joinOrganization", (organizationId) => {
      socket.join(`organization:${organizationId}`);
    });

    // START TIMER
    socket.on("startTimer", async (data) => {
      console.info("DATA RECEIVED:", data);

      try {
        // CHECK EXISTING RUNNING TIMER
        const existing = await Timer.findOne({
          user: data.userId,
          status: "running",
        });

        if (existing) {
          return socket.emit("timerError", "Timer already running");
        }

        const user = await User.findById(data.userId);

        // HANDLE BREAK
        if (user?.breakStartTime) {
          const breakStart = new Date(user.breakStartTime);
          const breakEnd = new Date();

          // Create break only if it's the same day
          if (breakStart.toDateString() === breakEnd.toDateString()) {
            const breakDuration = Math.floor((breakEnd - breakStart) / 1000);

            await Session.create({
              userId: user._id,
              startTime: breakStart,
              endTime: breakEnd,
              duration: breakDuration,
              type: "break",
              date: breakStart.toISOString().split("T")[0],
            });

            await updateSyncStatus(user._id);
          } else {
            console.info("Ignoring overnight break");
          }

          user.breakStartTime = null;
          await user.save();
        }

        const createdTimer = await Timer.create({
          user: data.userId,
          project: data.project,
          task: data.task,
          startTime: new Date(),
          status: "running",
        });

        const timer = await Timer.findById(createdTimer._id)
          .populate("project", "name")
          .populate("task", "title");

        socket.emit("timerStarted", timer);
      } catch (err) {
        console.error(err.message);
      }
    });

    // SWITCH TASK
    socket.on("switchTask", async (data) => {
      try {
        const timer = await Timer.findOne({
          user: data.userId,
          status: "running",
        });

        if (!timer) return;

        // End current timer session
        timer.endTime = new Date();
        timer.duration = Math.floor((timer.endTime - timer.startTime) / 1000);
        timer.status = "stopped";

        await timer.save();

        // Save work session
        await Session.create({
          userId: timer.user,
          startTime: timer.startTime,
          endTime: timer.endTime,
          duration: timer.duration,
          type: "work",
          date: timer.startTime.toISOString().split("T")[0],
        });

        // Save project tracking only for task timers
        if (timer.project && timer.task) {
          await ProjectTracking.create({
            user: timer.user,
            project: timer.project,
            task: timer.task,
            startTime: timer.startTime,
            endTime: timer.endTime,
            duration: timer.duration,
            date: timer.startTime.toISOString().split("T")[0],
          });
        }

        // Start a new running timer
        const createdTimer = await Timer.create({
          user: timer.user,
          project: data.project,
          task: data.task,
          startTime: new Date(),
          status: "running",
        });

        const newTimer = await Timer.findById(createdTimer._id)
          .populate("project", "name")
          .populate("task", "title");

        socket.emit("timerStarted", newTimer);
      } catch (err) {
        console.error(err);
      }
    });

    // STOP TIMER
    socket.on("stopTimer", async (data) => {
      try {
        const timer = await Timer.findById(data.timerId);

        if (!timer) return;

        timer.endTime = new Date();

        timer.duration = Math.floor((timer.endTime - timer.startTime) / 1000);

        timer.status = "stopped";

        await timer.save();

        await Session.create({
          userId: timer.user,
          startTime: timer.startTime,
          endTime: timer.endTime,
          duration: timer.duration,
          type: "work",
          date: timer.startTime.toISOString().split("T")[0],
        });

        // Save project tracking only for task timers
        if (timer.project && timer.task) {
          await ProjectTracking.create({
            user: timer.user,
            project: timer.project,
            task: timer.task,
            startTime: timer.startTime,
            endTime: timer.endTime,
            duration: timer.duration,
            date: timer.startTime.toISOString().split("T")[0],
          });
        }

        await checkDailyWarning(timer.user);

        await updateSyncStatus(timer.user);

        await User.findByIdAndUpdate(timer.user, {
          breakStartTime: timer.endTime,
        });

        socket.emit("timerStopped", timer);
      } catch (err) {
        console.error(err.message);
      }
    });

    socket.on("disconnect", () => {
      console.info("Socket disconnected:", socket.id);
    });
  });
};

export const getIO = () => io;
