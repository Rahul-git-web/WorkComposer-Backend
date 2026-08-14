import Role from "../models/role.model.js";

export const getUserPermissions = async (user) => {
  // No role assigned
  if (!user.roleRef) {
    return [];
  }

  const role = await Role.findById(user.roleRef).select("permissions");

  if (!role) {
    return [];
  }

  return role.permissions || [];
};