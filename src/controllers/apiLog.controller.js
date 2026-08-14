import ApiLog from "../models/apiLog.model.js";

export const getApiLogs = async (req, res) => {
  try {
    const organization = req.user.organization;

    const { startDate, endDate } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      organization,
    };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const total = await ApiLog.countDocuments(filter);

    const logs = await ApiLog.find(filter)
      .populate("apiKey", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedLogs = logs.map((log) => ({
      id: log._id,
      apiKey: log.apiKey?.name || "-",
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      createdAt: log.createdAt,
    }));

    return res.status(200).json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch API logs.",
    });
  }
};
