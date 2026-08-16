import User from "../models/user.model.js";

export const getTrackingReportRecipients = async (user) => {
  switch (user.role) {
    case "owner":
    case "admin":
      return await User.find({
        organization: user.organization,
        isVerified: true,
      });

    case "manager":
      return await User.find({
        manager: user._id,
        isVerified: true,
      });

    default:
      return [user];
  }
};
