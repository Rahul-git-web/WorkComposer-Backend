import axios from "axios";
import Integration from "../models/integration.model.js";
import User from "../models/user.model.js";

// Axios helper for Keka HR API
const kekaClient = (apiKey) =>
  axios.create({
    baseURL: "https://api.keka.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

export const connectKeka = async (req, res) => {
  try {
    const { apiKey, subdomain } = req.body;

    if (!apiKey || !subdomain) {
      return res.status(400).json({
        message: "API Key and Subdomain / Company ID are required",
      });
    }

    const client = kekaClient(apiKey);

    // Test credentials by fetching employee list
    let employees;
    try {
      const { data } = await client.get("/hr/employees");
      employees = data?.data || data || [];
    } catch (err) {
      return res.status(400).json({
        message: "Invalid Keka API Key or Subdomain",
      });
    }

    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "keka",
      },
      {
        connected: true,
        apiKey,
        subdomain,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: "Keka HR connected successfully",
      employeeCount: employees.length,
    });
  } catch (err) {
    console.error("[Keka Connect Error]:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to connect Keka HR" });
  }
};

export const getKekaIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "keka",
    });

    if (!integration) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: integration.connected,
      subdomain: integration.subdomain,
      provider: integration.provider,
      lastSyncedAt: integration.lastSyncedAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch Keka integration" });
  }
};

export const disconnectKeka = async (req, res) => {
  try {
    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "keka",
      },
      {
        connected: false,
        apiKey: null,
        subdomain: null,
      }
    );

    return res.json({ message: "Keka HR disconnected successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to disconnect Keka HR" });
  }
};

export const getKekaEmployees = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "keka",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({ message: "Keka HR is not connected" });
    }

    const client = kekaClient(integration.apiKey);
    const { data } = await client.get("/hr/employees");

    return res.json(data?.data || data || []);
  } catch (err) {
    console.error("[Keka Get Employees]:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to fetch Keka employees" });
  }
};

export const syncKekaEmployees = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "keka",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({ message: "Keka HR is not connected" });
    }

    const client = kekaClient(integration.apiKey);
    const { data } = await client.get("/hr/employees");

    const employees = data?.data || data || [];
    let syncedCount = 0;

    for (const employee of employees) {
      const email = employee.email || employee.workEmail;
      if (!email) continue;

      const updatedUser = await User.findOneAndUpdate(
        {
          email,
          organization: req.user.organization._id,
        },
        { kekaEmployeeId: employee.id || employee.employeeNumber },
        { new: true }
      );

      if (updatedUser) syncedCount++;
    }

    integration.lastSyncedAt = new Date();
    await integration.save();

    return res.json({
      message: "Employees synced successfully from Keka",
      syncedCount,
      lastSyncedAt: integration.lastSyncedAt,
    });
  } catch (err) {
    console.error("[Keka Sync Error]:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to sync Keka employees" });
  }
};

export const getKekaLeaves = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "keka",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({ message: "Keka HR is not connected" });
    }

    const client = kekaClient(integration.apiKey);
    const { data } = await client.get("/time/leaves");

    return res.json(data?.data || data || []);
  } catch (err) {
    console.error("[Keka Leaves Error]:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to fetch Keka leaves" });
  }
};

// Cron helper
export const syncAllKekaOrganizations = async () => {
  const integrations = await Integration.find({
    provider: "keka",
    connected: true,
  });

  for (const integration of integrations) {
    try {
      const client = kekaClient(integration.apiKey);
      const { data } = await client.get("/hr/employees");
      const employees = data?.data || data || [];

      for (const employee of employees) {
        const email = employee.email || employee.workEmail;
        if (!email) continue;

        await User.findOneAndUpdate(
          {
            email,
            organization: integration.organization,
          },
          { kekaEmployeeId: employee.id || employee.employeeNumber }
        );
      }

      integration.lastSyncedAt = new Date();
      await integration.save();
    } catch (err) {
      console.error(
        `[Keka Cron] Failed to sync org ${integration.organization}:`,
        err.response?.data || err.message
      );
    }
  }
};