import Role from "../models/role.model.js";
import { ALL_PERMISSIONS } from "./permissions.js";

export const createDefaultRoles = async (organizationId) => {
  const roles = [
    {
      name: "Owner",
      description: "Full access",
      isSystem: true,
      permissions: [...ALL_PERMISSIONS],
      reportAccess: "all",
      screenshotAccess: "all",
    },
    {
      name: "Admin",
      description: "Administrative access",
      isSystem: true,
      permissions: [],
      reportAccess: "none",
      screenshotAccess: "none",
    },
    {
      name: "Manager",
      description: "Manager access",
      isSystem: true,
      permissions: [],
      reportAccess: "none",
      screenshotAccess: "none",
    },
    {
      name: "User",
      description: "Standard user",
      isSystem: true,
      permissions: [],
      reportAccess: "none",
      screenshotAccess: "none",
    },
  ];

  for (const role of roles) {
    const exists = await Role.findOne({
      organization: organizationId,
      name: role.name,
    });

    if (!exists) {
      await Role.create({
        organization: organizationId,
        ...role,
      });
    }
  }
};