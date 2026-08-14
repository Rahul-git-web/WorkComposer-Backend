import Integration from "../models/integration.model.js";

export const getAllIntegrationStatuses = async (req, res) => {
  try {
    const orgId = req.user.organization._id || req.user.organization;

    // Fetch all integration records for this organization
    const integrations = await Integration.find({
      organization: orgId,
    });

    const statusMap = {
      jira: false,
      asana: false,
      slack: false,
      keka: false,
      bamboohr: false,
      storage: false,
    };

    integrations.forEach((item) => {
      // Determine if connected: either flag is true OR token/apiKey exists
      const isConnected =
        item.connected === true ||
        Boolean(item.accessToken) ||
        Boolean(item.apiKey);

      if (item.provider in statusMap) {
        statusMap[item.provider] = isConnected;
      }
    });

    return res.json(statusMap);
  } catch (err) {
    console.error("[Integration Status Summary Error]:", err);
    return res.status(500).json({ message: "Failed to fetch integration statuses" });
  }
};