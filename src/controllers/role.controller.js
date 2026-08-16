import Role from "../models/role.model.js";
import User from "../models/user.model.js";

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({
      organization: req.user.organization,
      name: { $ne: "owner" },
    }).lean();

    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({
          organization: req.user.organization,
          roleRef: role._id,
        });

        const permissionCount =
          role.permissions.length +
          (role.reportAccess !== "none" ? 1 : 0) +
          (role.screenshotAccess !== "none" ? 1 : 0);

        return {
          ...role,
          userCount,
          permissionCount,
        };
      }),
    );

    res.json(rolesWithCounts);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch roles",
    });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;

    const { permissions, reportAccess, screenshotAccess } = req.body;

    const role = await Role.findOne({
      _id: id,
      organization: req.user.organization,
    });

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    if (role.name.toLowerCase() === "owner") {
      return res.status(403).json({
        message: "Owner role cannot be modified.",
      });
    }

    role.permissions = permissions;
    role.reportAccess = reportAccess;
    role.screenshotAccess = screenshotAccess;

    await role.save();

    res.json({
      message: "Role updated successfully",
      role,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update role",
    });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      organization: req.user.organization,
    }).lean();

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    if (role.name.toLowerCase() === "owner") {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    const userCount = await User.countDocuments({
      organization: req.user.organization,
      roleRef: role._id,
    });

    const permissionCount =
      role.permissions.length +
      (role.reportAccess !== "none" ? 1 : 0) +
      (role.screenshotAccess !== "none" ? 1 : 0);

    res.json({
      ...role,
      userCount,
      permissionCount,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};
