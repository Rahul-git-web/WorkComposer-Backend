import Role from "../models/role.model.js";
import User from "../models/user.model.js";

export const getReportAccess = async (user) => {
  // Owner has full access
  if (user.role?.toLowerCase() === "owner") {
    return "all";
  }

  if (!user.roleRef) {
    return "none";
  }

  const role = await Role.findById(user.roleRef).select("reportAccess");

  return role?.reportAccess || "none";
};

export const getReportUserIds = async (user) => {
  const reportAccess = await getReportAccess(user);

  if (reportAccess === "none") {
    return null;
  }

  if (reportAccess === "own") {
    return [user._id];
  }

  if (reportAccess === "managed") {
    const managedUsers = await User.find({
      manager: user._id,
    }).select("_id");

    return [user._id, ...managedUsers.map((managedUser) => managedUser._id)];
  }

  // all
  return null;
};
