import ApiKey from "../models/apiKey.model.js";
import { generateApiKey as generateApiKeyValue } from "../utils/generateApiKey.js";
import { hashApiKey } from "../utils/hashApiKey.js";

export const generateApiKey = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "API key name is required.",
      });
    }

   const organization = req.user.organization;

    if (!organization) {
      return res.status(400).json({
        message: "Organization not found.",
      });
    }

    // Generate API key
    const apiKey = generateApiKeyValue();

    // Hash the key before storing
    const keyHash = hashApiKey(apiKey);

    // Store only the prefix for display
    const keyPreview = `${apiKey.substring(0, 8)}****************`;

    const newApiKey = await ApiKey.create({
      organization: organization._id,
      name: name.trim(),
      keyHash,
      keyPreview,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "API Key generated successfully.",
      apiKey: {
        id: newApiKey._id,
        name: newApiKey.name,
        key: apiKey,
        keyPreview: newApiKey.keyPreview,
        createdAt: newApiKey.createdAt,
        generatedBy: req.user.name || req.user.email,
      },
    });
  } catch (error) {
    console.error("Generate API Key Error:", error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getApiKeys = async (req, res) => {
  try {
    const organization = req.user.organization;

    const apiKeys = await ApiKey.find({
      organization: organization._id,
      isActive: true,
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const formattedKeys = apiKeys.map((key) => ({
      id: key._id,
      name: key.name,
      generatedBy: key.createdBy?.name || key.createdBy?.email,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      maskedKey: key.keyPreview,
    }));


    return res.status(200).json({
      apiKeys: formattedKeys,
    });
  } catch (error) {
    console.error("Get API Keys Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateApiKey = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "API key name is required.",
      });
    }

    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      isActive: true,
    });

    if (!apiKey) {
      return res.status(404).json({
        message: "API key not found.",
      });
    }

    apiKey.name = name.trim();

    await apiKey.save();

    return res.status(200).json({
      message: "API key updated successfully.",
      apiKey,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update API key.",
    });
  }
};

export const deleteApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      organization: req.user.organization,
      isActive: true,
    });

    if (!apiKey) {
      return res.status(404).json({
        message: "API key not found.",
      });
    }

    apiKey.isActive = false;
    apiKey.revokedAt = new Date();

    await apiKey.save();

    return res.status(200).json({
      message: "API key deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete API key.",
    });
  }
};
