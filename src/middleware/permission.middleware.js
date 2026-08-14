import Role from "../models/role.model.js";

export const hasPermission = async (user, permission) => {
  // Owner always has every permission
  if (user.role === "owner") {
    return true;
  }

  // Safety check
  if (!user.roleRef) {
    return false;
  }

  const role = await Role.findById(user.roleRef).select("permissions");

  if (!role) {
    return false;
  }

  return role.permissions.includes(permission);
};

export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const allowed = await hasPermission(req.user, permission);

      if (!allowed) {
        return res.status(403).json({
          message: "Permission denied",
        });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: "Permission check failed",
      });
    }
  };
};
