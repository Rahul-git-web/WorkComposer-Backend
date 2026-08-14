import ManualTimeRequest from "../models/manualTimeRequest.model.js";
import Session from "../models/session.model.js";
import Attendance from "../models/attendance.model.js";
import { checkSessionOverlap } from "../utils/session.js";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/user.model.js";
import TimeTrackingSettings from "../models/timeTrackingSettings.model.js";
import Report from "../models/report.model.js";
import { generateTimeTrackingCSV } from "../services/reportExport.service.js";

export const createRequest = async (req, res) => {
  try {
    const { startTime, endTime, duration, date, type, reason, project, task } =
      req.body;

    const settings = await TimeTrackingSettings.findOne({
      organization: req.user.organization,
    });

    if (!settings?.manualTime?.allowManualTime) {
      return res.status(403).json({
        message: "Manual time is disabled by your organization.",
      });
    }

    if (settings?.manualTime?.requireProjectTask && !project) {
      return res.status(400).json({
        message: "A project is required for manual time.",
      });
    }

    const backdatingLimit = settings?.manualTime?.backdatingLimit ?? 0;

    if (backdatingLimit > 0) {
      const selectedDate = new Date(date);

      selectedDate.setHours(0, 0, 0, 0);

      const earliestDate = new Date();

      earliestDate.setHours(0, 0, 0, 0);

      earliestDate.setDate(earliestDate.getDate() - backdatingLimit);

      if (selectedDate < earliestDate) {
        return res.status(400).json({
          message: `Manual time can only be added up to ${backdatingLimit} day(s) in the past.`,
        });
      }
    }

    if (!reason?.trim()) {
      return res.status(400).json({
        message: "Reason is required.",
      });
    }

    const existingSession = await checkSessionOverlap(
      req.user._id,
      startTime,
      endTime,
    );

    if (existingSession) {
      return res.status(400).json({
        message: "This time overlaps with an existing work session.",
      });
    }

    const existingRequest = await ManualTimeRequest.findOne({
      requestedBy: req.user._id,
      status: "pending",

      startTime: {
        $lt: new Date(endTime),
      },

      endTime: {
        $gt: new Date(startTime),
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        message:
          "You already have a pending manual time request for this time period.",
      });
    }

    if (!settings?.manualTime?.requireApproval) {
      const session = await Session.create({
        userId: req.user._id,

        project: project || null,
        task: task || null,

        startTime,
        endTime,
        duration,
        date,
        type,

        source: "manual",
      });

      const reportType =
        type === "work" ? "manual-work-time" : "manual-break-time";

      const report = await Report.create({
        user: req.user._id,
        type: reportType,
        status: "processing",
        startDate: date,
        endDate: date,
      });

      const result = await generateTimeTrackingCSV(
        report._id,
        [
          {
            employee: `${req.user.firstName} ${req.user.lastName}`,
            date,
            startTime: new Date(startTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endTime: new Date(endTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            duration: `${Math.floor(duration / 3600)}h ${Math.floor(
              (duration % 3600) / 60,
            )}m`,
            type,
            project: project || "",
            task: task || "",
            reason: reason.trim(),
          },
        ],
        reportType,
      );

      await report.save();

      return res.status(201).json({
        message: "Manual time added successfully.",
        session,
      });
    }

    const request = await ManualTimeRequest.create({
      organization: req.user.organization,
      requestedBy: req.user._id,

      project: project || null,
      task: task || null,

      startTime,
      endTime,
      duration,
      date,
      type,

      reason: reason.trim(),
    });

    const reportType =
      type === "work" ? "manual-work-time" : "manual-break-time";

    const report = await Report.create({
      user: req.user._id,
      type: reportType,
      status: "processing",
      startDate: date,
      endDate: date,
    });

    request.report = report._id;

    await request.save();

    report.status = "done";
    report.fileUrl = result.fileUrl;
    report.generatedAt = new Date();

    await report.save();

    return res.status(201).json({
      message: "Manual time request submitted for approval.",
      request,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getRequests = async (req, res) => {
  try {
    const query = {
      organization: req.user.organization,
    };

    if (req.user.role === "user") {
      query.requestedBy = req.user._id;
    }

    if (req.user.role === "manager") {
      const managedUsers = await User.find({
        organization: req.user.organization,
        manager: req.user._id,
      }).select("_id");

      query.requestedBy = {
        $in: managedUsers.map((user) => user._id),
      };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const requests = await ManualTimeRequest.find(query)
      .populate({
        path: "requestedBy",
        select: "firstName lastName email avatar role team",
        populate: {
          path: "team",
          select: "name",
        },
      })
      .populate("approvedBy", "firstName lastName")
      .sort({
        createdAt: -1,
      });

    res.json(requests);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const request = await ManualTimeRequest.findById(req.params.id).populate(
      "requestedBy",
      "firstName lastName email",
    );

    if (!request) {
      return res.status(404).json({
        message: "Request not found.",
      });
    }

    const settings = await TimeTrackingSettings.findOne({
      organization: req.user.organization,
    });

    if (req.user.role === "manager" && !settings?.manualTime?.managerApproval) {
      return res.status(403).json({
        message: "Managers are not allowed to approve manual time requests.",
      });
    }

    if (req.user.role === "manager") {
      const employee = await User.findById(request.requestedBy).select(
        "manager",
      );

      if (
        !employee ||
        employee.manager?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only approve requests from users you manage.",
        });
      }
    }

    if (req.user.role === "user") {
      return res.status(403).json({
        message: "You are not allowed to approve requests.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request has already been processed.",
      });
    }

    const existingSession = await checkSessionOverlap(
      request.requestedBy,
      request.startTime,
      request.endTime,
    );

    if (existingSession) {
      return res.status(400).json({
        message: "This request overlaps with an existing session.",
        existingSession,
      });
    }

    const session = await Session.create({
      userId: request.requestedBy,

      project: request.project,
      task: request.task,

      startTime: request.startTime,
      endTime: request.endTime,
      duration: request.duration,

      type: request.type,
      date: request.date,

      source: "manual",
    });

    const report = request.report
      ? await Report.findById(request.report)
      : null;

    if (report) {
      const result = await generateTimeTrackingCSV(
        report._id,
        [
          {
            employee: `${request.requestedBy.firstName} ${request.requestedBy.lastName}`,
            date: request.date,
            startTime: new Date(request.startTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endTime: new Date(request.endTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            duration: `${Math.floor(request.duration / 3600)}h ${Math.floor(
              (request.duration % 3600) / 60,
            )}m`,
            type: request.type,
            project: request.project || "",
            task: request.task || "",
            reason: request.reason || "",
          },
        ],
        report.type,
      );

      report.status = "done";
      report.fileUrl = result.fileUrl;
      report.generatedAt = new Date();

      await report.save();
    }

    report.status = "done";
    report.fileUrl = result.fileUrl;
    report.generatedAt = new Date();

    await report.save();

    request.status = "approved";

    request.approvedBy = req.user._id;

    request.approvedAt = new Date();

    await request.save();

    return res.json({
      message: "Request approved successfully.",
      session,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { comment } = req.body;

    const request = await ManualTimeRequest.findById(req.params.id).populate(
      "requestedBy",
      "firstName lastName email",
    );

    if (!request) {
      return res.status(404).json({
        message: "Request not found.",
      });
    }

    const settings = await TimeTrackingSettings.findOne({
      organization: req.user.organization,
    });

    if (req.user.role === "manager" && !settings?.manualTime?.managerApproval) {
      return res.status(403).json({
        message: "Managers are not allowed to approve manual time requests.",
      });
    }

    if (req.user.role === "manager") {
      const employee = await User.findById(request.requestedBy).select(
        "manager",
      );

      if (
        !employee ||
        employee.manager?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only approve requests from users you manage.",
        });
      }
    }

    if (req.user.role === "user") {
      return res.status(403).json({
        message: "You are not allowed to approve requests.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request has already been processed.",
      });
    }

    request.status = "rejected";
    request.managerComment = comment || "";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();

    await request.save();

    if (request.report) {
  const report = await Report.findById(request.report);

  if (report) {
    report.status = "failed";
    await report.save();
  }
}

    await sendEmail(
      request.requestedBy.email,
      "Manual Time Request Rejected",
      `
    <h2>Manual Time Request Rejected</h2>

    <p>Hello ${request.requestedBy.firstName},</p>

    <p>Your manual <strong>${request.type}</strong> request has been rejected.</p>

    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td><strong>Date</strong></td>
        <td>${request.date}</td>
      </tr>

      <tr>
        <td><strong>Time</strong></td>
        <td>
          ${new Date(request.startTime).toLocaleString()}
          -
          ${new Date(request.endTime).toLocaleTimeString()}
        </td>
      </tr>

      <tr>
        <td><strong>Reason from Manager</strong></td>
        <td>${request.managerComment}</td>
      </tr>
    </table>

    <p>
      If you believe this request was rejected by mistake,
      please contact your manager.
    </p>

    <br/>

    <p>
      <strong>WorkComposer</strong>
    </p>
  `,
    );

    res.json({
      message: "Request rejected successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getPendingCount = async (req, res) => {
  try {
    const count = await ManualTimeRequest.countDocuments({
      organization: req.user.organization,
      status: "pending",
    });

    res.json({
      count,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
