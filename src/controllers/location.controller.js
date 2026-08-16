import Location from "../models/location.model.js";
import User from "../models/user.model.js";
import { hasPermission } from "../middleware/permission.middleware.js";
import geocoder from "../utils/geocoder.js";
import { getAvatarUrl } from "../utils/avatar.js";

// SAVE LOCATION
export const saveLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    let address = {};

    try {
      const [result] = await geocoder.reverse({
        lat: latitude,
        lon: longitude,
      });

      if (result) {
        address = {
          country: result.country || "",
          state: result.state || "",
          city:
            result.city ||
            result.administrativeLevels?.level2long ||
            result.county ||
            "",
          postalCode: result.zipcode || "",
          address: result.formattedAddress || "",
        };
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err.message);
    }

    let ipAddress = "";
    let serviceProvider = "";

    try {
      ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "";

      if (ipAddress === "::1") {
        ipAddress = "127.0.0.1";
      }

      // Skip localhost during development
      if (ipAddress !== "127.0.0.1") {
        const response = await fetch(
          `https://api.ipinfo.io/lite/${ipAddress}?token=${process.env.IPINFO_TOKEN}`,
        );

        if (response.ok) {
          const info = await response.json();

          serviceProvider = info.org || "";
        }
      }
    } catch (err) {
      console.error("IP lookup failed:", err.message);
    }

    const location = await Location.findOneAndUpdate(
      {
        organization: req.user.organization,
        user: req.user._id,
      },
      {
        organization: req.user.organization,

        latitude,
        longitude,
        accuracy,

        country: address.country,
        state: address.state,
        city: address.city,
        postalCode: address.postalCode,
        address: address.address,

        ipAddress,
        serviceProvider,

        trackedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    res.json(location);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// GET LIVE LOCATIONS
export const getLocations = async (req, res) => {
  try {
    const { startDate, endDate, teams, users } = req.query;

    const canManageUsers = await hasPermission(req.user, "manage_users");

    const query = {
      organization: req.user.organization,
    };

    // Employees can only see themselves
    if (!canManageUsers) {
      query.user = req.user._id;
    } else if (users?.trim()) {
      query.user = {
        $in: users.split(",").filter(Boolean),
      };
    }

    // Team filter
    if (canManageUsers && teams?.trim() && !users?.trim()) {
      const teamIds = teams.split(",").filter(Boolean);

      const teamUsers = await User.find({
        organization: req.user.organization,
        team: {
          $in: teamIds,
        },
      }).select("_id");

      query.user = {
        $in: teamUsers.map((u) => u._id),
      };
    }

    // Date filter
    if (startDate && endDate) {
      query.trackedAt = {
        $gte: new Date(startDate),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const records = await Location.find(query)
      .populate({
        path: "user",
        select: "firstName lastName email avatar team",
      })
      .sort({
        trackedAt: -1,
      });

    for (const record of records) {
      if (record.user) {
        record.user.avatar = getAvatarUrl(record.user.avatar);
      }
    }

    const latestLocations = [];
    const seenUsers = new Set();

    for (const record of records) {
      const userId = record.user._id.toString();

      if (seenUsers.has(userId)) continue;

      seenUsers.add(userId);
      latestLocations.push(record);
    }

    res.json(latestLocations);
  } catch (err) {
   console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
