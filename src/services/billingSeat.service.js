import User from "../models/user.model.js";

export const getOrganizationSeatCount = async (organizationId) => {
    const count = await User.countDocuments({
        organization: organizationId,
        isArchived: false,
    });

    return Math.max(count, 1);
};