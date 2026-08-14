import axios from "axios";
import Integration from "../models/integration.model.js";
import User from "../models/user.model.js";

const bambooHRClient = (subdomain, apiKey) =>
  axios.create({
    baseURL: `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`,
    auth: {
      username: apiKey,
      password: "x",
    },
    headers: {
      Accept: "application/json",
    },
  });

export const connectBambooHR = async (req, res) => {
  try {
    const { apiKey, subdomain } = req.body;

    if (!apiKey || !subdomain) {
      return res.status(400).json({
        message: "API key and subdomain are required",
      });
    }

    const client = bambooHRClient(subdomain, apiKey);

    let directory;

    try {
      const { data } = await client.get("/employees/directory");
      directory = data;
    } catch (err) {
      return res.status(400).json({
        message: "Invalid BambooHR API key or subdomain",
      });
    }

    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "bamboohr",
      },
      {
        connected: true,
        apiKey,
        subdomain,
      },
      {
        upsert: true,
        new: true,
      },
    );

    return res.json({
      message: "BambooHR connected successfully",
      employeeCount: directory.employees?.length || 0,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to connect BambooHR",
    });
  }
};

export const getBambooHRIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "bamboohr",
    });

    if (!integration) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: integration.connected,
      subdomain: integration.subdomain,
      provider: integration.provider,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to fetch BambooHR integration",
    });
  }
};

export const disconnectBambooHR = async (req, res) => {
  try {
    await Integration.findOneAndUpdate(
      {
        organization: req.user.organization._id,
        provider: "bamboohr",
      },
      {
        connected: false,
        apiKey: null,
        subdomain: null,
      },
    );

    return res.json({
      message: "BambooHR disconnected successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to disconnect BambooHR",
    });
  }
};

export const getBambooHREmployees = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "bamboohr",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "BambooHR is not connected",
      });
    }

    const client = bambooHRClient(integration.subdomain, integration.apiKey);

    const { data } = await client.get("/employees/directory");

    return res.json(data.employees || []);
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to fetch BambooHR employees",
    });
  }
};

export const syncBambooHREmployees = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "bamboohr",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "BambooHR is not connected",
      });
    }

    const client = bambooHRClient(integration.subdomain, integration.apiKey);

    const { data } = await client.get("/employees/directory");

    let syncedCount = 0;

    for (const employee of data.employees || []) {
      if (!employee.workEmail) {
        continue;
      }

      const updatedUser = await User.findOneAndUpdate(
        {
          email: employee.workEmail,
          organization: req.user.organization._id,
        },
        { bambooHREmployeeId: employee.id },
        { new: true },
      );

      if (updatedUser) {
        syncedCount++;
      }
    }

    return res.json({
      message: "Employees synced successfully",
      syncedCount,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to sync BambooHR employees",
    });
  }
};

export const getBambooHRTimeOff = async (req, res) => {
  try {
    const integration = await Integration.findOne({
      organization: req.user.organization._id,
      provider: "bamboohr",
      connected: true,
    });

    if (!integration) {
      return res.status(400).json({
        message: "BambooHR is not connected",
      });
    }

    const client = bambooHRClient(integration.subdomain, integration.apiKey);

    const today = new Date();
    const start = req.query.start || today.toISOString().split("T")[0];
    const end =
      req.query.end ||
      new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const { data } = await client.get("/time_off/whos_out", {
      params: { start, end },
    });

    return res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      message: "Failed to fetch BambooHR time off",
    });
  }
};

// For a cron job, mirrors syncAllJiraProjects
export const syncAllBambooHROrganizations = async () => {
  const integrations = await Integration.find({
    provider: "bamboohr",
    connected: true,
  });

  for (const integration of integrations) {
    try {
      const client = bambooHRClient(integration.subdomain, integration.apiKey);
      const { data } = await client.get("/employees/directory");

      for (const employee of data.employees || []) {
        if (!employee.workEmail) continue;

        await User.findOneAndUpdate(
          {
            email: employee.workEmail,
           organization: integration.organization, 
          },
          { bambooHREmployeeId: employee.id },
          { new: true },
        );
      }
    } catch (err) {
      console.error(
        `[BambooHR] Failed to sync organization ${integration.organization}:`,
        err.response?.data || err.message,
      );
    }
  }
};
