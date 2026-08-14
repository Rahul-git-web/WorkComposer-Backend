import AuditLog from "../models/auditLog.model.js";

export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      user,
      category,
      startDate,
      endDate,
    } = req.query;

    const query = {
      organization: req.user.organization,
    };

    // Filter by user
    if (user && user !== "all") {
      query.performedBy = user;
    }

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate("performedBy", "firstName lastName avatar email")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch audit logs",
    });
  }
};
