import ApiKey from "../models/apiKey.model.js";
import { hashApiKey } from "../utils/hashApiKey.js";

export const apiKeyAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "API key is required.",
            });
        }

        const apiKey = authHeader.split(" ")[1];

        const hashedKey = hashApiKey(apiKey);

        const key = await ApiKey.findOne({
            keyHash: hashedKey,
            isActive: true,
        }).populate("organization");

        if (!key) {
            return res.status(401).json({
                message: "Invalid API key.",
            });
        }

        req.apiKey = key;
        req.organization = key.organization;

        next();
    } catch (error) {
        console.error(error);

        return res.status(401).json({
            message: "Invalid API key.",
        });
    }
};