import TimeTrackingSettings from "../models/timeTrackingSettings.model.js";

export const getShiftSettings = async (req, res) => {
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

    if (!settings.shift.schedule || settings.shift.schedule.length === 0) {
      settings.shift.schedule = [
        {
          day: "Monday",
          enabled: true,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Tuesday",
          enabled: true,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Wednesday",
          enabled: true,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Thursday",
          enabled: true,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Friday",
          enabled: true,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Saturday",
          enabled: false,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
        {
          day: "Sunday",
          enabled: false,
          startTime: "09:00",
          endTime: "18:00",
          breaks: [],
        },
      ];

      await settings.save();
    }

    return res.status(200).json(settings.shift);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch shift settings.",
    });
  }
};

export const updateShiftSettings = async (req, res) => {
  try {
    const settings = await TimeTrackingSettings.findOneAndUpdate(
      {
        organization: req.user.organization,
      },
      {
        $set: {
          shift: req.body,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      message: "Shift settings updated successfully.",
      settings: settings.shift,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update shift settings.",
    });
  }
};
