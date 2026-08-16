import TimeTrackingSettings from "../models/timeTrackingSettings.model.js";
import { getIO } from "../socket/socket.js";
import User from "../models/user.model.js";
import resolveTrackingSettings from "../utils/resolveTrackingSettings.js";

export const getTimeTrackingSettings = async (req, res) => {
  try {
    const settings = await TimeTrackingSettings.findOneAndUpdate(
      {
        organization: req.user.organization,
      },
      {
        $setOnInsert: {
          organization: req.user.organization,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    return res.status(200).json(settings);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch time tracking settings.",
    });
  }
};

export const updateTimeTrackingSettings = async (req, res) => {
  try {
    const settings = await TimeTrackingSettings.findOneAndUpdate(
      
      {
        organization: req.user.organization,
      },
      req.body,
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    const organizationId = req.user.organization._id || req.user.organization;

    getIO()
      .to(`organization:${organizationId}`)
      .emit("tracking-settings-updated", settings);

    return res.status(200).json({
      message: "Time tracking settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update time tracking settings.",
    });
  }
};

export const getEffectiveTimeTrackingSettings = async (req, res) => {
  try {
    const organizationSettings = await TimeTrackingSettings.findOne({
      organization: req.user.organization,
    });

    const user = await User.findById(req.user._id);

    const settings = resolveTrackingSettings(organizationSettings, user);

    return res.status(200).json(settings);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to load effective settings.",
    });
  }
};
