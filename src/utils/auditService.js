import { logAudit } from "./logAudit.js";

export const auditSettingsChanged = async ({
  req,
  setting,
  previousValue,
  newValue,
  affectedUser,
}) => {
  await logAudit({
    organization: req.user.organization,
    performedBy: req.user._id,

    category: "Settings",

    activity: `Updated ${setting} for ${affectedUser.firstName} ${affectedUser.lastName}`,

    details: {
      setting,
      previousValue,
      newValue,

      affectedUser: {
        id: affectedUser._id,
        name: `${affectedUser.firstName} ${affectedUser.lastName}`,
        email: affectedUser.email,
      },
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};

export const auditLogin = async ({
  req,
  user,
  loginMethod = "Email & Password",
  appVersion = "1.0.0",
}) => {
  await logAudit({
    organization: user.organization,
    performedBy: user._id,

    category: "Users",

    activity: "User logged in",

    details: {
      loginMethod,
      appVersion,
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};

export const auditUserCreated = async ({ req, createdUser }) => {
  await logAudit({
    organization: req.user.organization,
    performedBy: req.user._id,

    category: "Users",

    activity: `Created user ${createdUser.firstName} ${createdUser.lastName}`,

    details: {
      user: {
        id: createdUser._id,
        name: `${createdUser.firstName} ${createdUser.lastName}`,
        email: createdUser.email,
        role: createdUser.role,
      },
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};

export const auditRoleChanged = async ({
  req,
  user,
  previousRole,
  newRole,
}) => {
  await logAudit({
    organization: req.user.organization,
    performedBy: req.user._id,

    category: "Users",

    activity: `Changed role for ${user.firstName} ${user.lastName}`,

    details: {
      previousRole,
      newRole,
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};

export const auditUserArchived = async ({
  req,
  user,
}) => {
  await logAudit({
    organization: req.user.organization,
    performedBy: req.user._id,

    category: "Users",

    activity: `Archived user ${user.firstName} ${user.lastName}`,

    details: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};

export const auditUserRestored = async ({
  req,
  user,
}) => {
  await logAudit({
    organization: req.user.organization,
    performedBy: req.user._id,

    category: "Users",

    activity: `Restored user ${user.firstName} ${user.lastName}`,

    details: {
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    },

    ipAddress: req.ip,

    platform:
      req.headers["sec-ch-ua-platform"]?.replace(/"/g, "") ||
      "Unknown Platform",
  });
};
