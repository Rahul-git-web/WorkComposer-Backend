import AppClassification from "../models/appClassification.model.js";

export const getAppClassifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const category = req.query.category || "all";

    const filter = {
      organization: req.user.organization,
    };

    if (search) {
      filter.appName = {
        $regex: search,
        $options: "i",
      };
    }

    if (category !== "all") {
      filter.productivity = category;
    }

    const [applications, total] = await Promise.all([
      AppClassification.find(filter)
        .sort({ appName: 1 })
        .skip(skip)
        .limit(limit),

      AppClassification.countDocuments(filter),
    ]);

    res.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const createAppClassification = async (req, res) => {
  try {
    const {
      appName,
      productivity,
      preventBreakMode,
      disableIdleCalculation,
      excludedTeams,
      excludedUsers,
    } = req.body;

    if (!appName) {
      return res.status(400).json({
        message: "Application name is required",
      });
    }

    const existing = await AppClassification.findOne({
      organization: req.user.organization,
      appName: appName.trim(),
    });

    if (existing) {
      if (existing.productivity === productivity) {
        return res.status(409).json({
          message: `${appName} is already classified as ${productivity}.`,
        });
      }

      const previous = existing.productivity;

      existing.productivity = productivity;
      existing.preventBreakMode = preventBreakMode;
      existing.disableIdleCalculation = disableIdleCalculation;
      existing.excludedTeams = excludedTeams || [];
      existing.excludedUsers = excludedUsers || [];

      await existing.save();

      return res.json({
        updated: true,
        message: `${appName} moved from ${previous} to ${productivity}.`,
        classification: existing,
      });
    }

    const classification = await AppClassification.create({
      organization: req.user.organization,
      appName: appName.trim(),
      productivity: productivity || "neutral",
      preventBreakMode,
      disableIdleCalculation,

      excludedTeams: excludedTeams || [],
      excludedUsers: excludedUsers || [],
    });

    res.status(201).json(classification);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const updateAppClassification = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      appName,
      productivity,
      preventBreakMode,
      disableIdleCalculation,
      excludedTeams,
      excludedUsers,
    } = req.body;

    const classification = await AppClassification.findOne({
      _id: id,
      organization: req.user.organization,
    });

    if (!classification) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    if (appName) {
      classification.appName = appName.trim();
    }

    if (productivity) {
      classification.productivity = productivity;
    }

    if (preventBreakMode !== undefined) {
      classification.preventBreakMode = preventBreakMode;
    }

    if (disableIdleCalculation !== undefined) {
      classification.disableIdleCalculation = disableIdleCalculation;
    }

    if (excludedTeams !== undefined) {
      classification.excludedTeams = excludedTeams;
    }

    if (excludedUsers !== undefined) {
      classification.excludedUsers = excludedUsers;
    }

    await classification.save();

    res.json(classification);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const deleteAppClassification = async (req, res) => {
  try {
    const { id } = req.params;

    const classification = await AppClassification.findOneAndDelete({
      _id: id,
      organization: req.user.organization,
    });

    if (!classification) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    res.json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getClassificationStats = async (req, res) => {
  try {
    const classifications = await AppClassification.find({
      organization: req.user.organization,
    });

    const stats = {
      productive: 0,
      neutral: 0,
      unproductive: 0,
      blacklisted: 0,
      total: classifications.length,
    };

    classifications.forEach((item) => {
      if (item.productivity === "productive") {
        stats.productive++;
      } else if (item.productivity === "neutral") {
        stats.neutral++;
      } else if (item.productivity === "unproductive") {
        stats.unproductive++;
      }
    });

    res.json(stats);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const checkBreakMode = async (req, res) => {
  try {
    const normalizedAppName = req.query.appName?.trim().toLowerCase();

    const config = await AppClassification.findOne({
      organization: req.user.organization,
      appName: normalizedAppName,
    });

    return res.json({
      preventBreakMode: config?.preventBreakMode || false,
      disableIdleCalculation: config?.disableIdleCalculation || false,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to check app configuration",
    });
  }
};
