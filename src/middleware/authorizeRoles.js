import User from "../models/user.model.js";


export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
 console.log("REQ USER:", req.user);
    console.log("USER ROLE:", req.user?.role);
    console.log("ALLOWED ROLES:", allowedRoles)


    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
};
