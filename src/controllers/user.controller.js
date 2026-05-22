import User from "../models/user.model.js";
import Invite from "../models/invite.model.js";
import EmailChange from "../models/emailChange.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import sendEmail from "../utils/sendEmail.js";
import inviteEmailTemplate from "../templates/inviteEmailTemplate.js";

export const getUsers = async (req, res) => {
  try {
    const currentUser = req.user;

    let users;

    //ROLE-BASED logic
    if (currentUser.role === "owner") {
      // OWNER = see all users in organization

      users = await User.find({
        organization: currentUser.organization,
      }).select("-password");
    } else if (currentUser.role === "admin") {
      // ADMIN = all except owner
      users = await User.find({
        organization: currentUser.organization,
        role: { $ne: "owner" },
      }).select("-password");
    } else if (currentUser.role === "manager") {
      // MANAGER = only same team users
      users = await User.find({
        organization: currentUser.organization,
        team: currentUser.team,
      }).select("-password");
    } else {
      //USER = only self
      users = await User.find({
        _id: currentUser._id,
      }).select("-password");
    }

    const userWithStats = await Promise.all(
      users.map(async (user) => {
        if (user.role !== "manager") {
          return user;
        }

        // USERS COUNT
        const managedUsers = await User.countDocuments({
          manager: user._id,
        });

        // TEAMS COUNT
        const managedTeams = await User.distinct("team", {
          manager: user._id,
          team: { $ne: null },
        });

        return {
          ...user.toObject(),
          managedUsersCount: managedUsers,
          managedTeamsCount: managedTeams.length,
        };
      }),
    );

    res.status(200).json(userWithStats);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

export const inviteUser = async (req, res) => {
  try {
    const { email, role, team } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!email || !role) {
      return res.status(400).json({
        message: "Email and role required",
      });
    }

    const existingInvite = await Invite.findOne({
      email: normalizedEmail,
      organization: req.user.organization,
      isAccepted: false,
      expireAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return res.status(400).json({
        message: "Invite already sent",
      });
    }

    //Check if already existing
    const existingUser = await User.findOne({
      email: normalizedEmail,
      organization: req.user.organization,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    if (normalizedEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({
        message: "You cannot invite yourself",
      });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const invite = await Invite.create({
      email: normalizedEmail,
      role,
      team,
      token: hashedToken,
      invitedBy: req.user._id,
      organization: req.user.organization,
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    // This will be your fronted link later
    const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${rawToken}`;

    console.log("INVITE LINK:", inviteLink);
    console.log("SENDING TO:", normalizedEmail);

    const html = inviteEmailTemplate({
      inviteLink,
      organization: req.user.organization,
      role,
      team,
    });

    const emailResponse = await sendEmail(
      normalizedEmail,
      "You're invited to WorkComposer",
      html,
    );

    console.log("EMAIL RESPONSE:", emailResponse);

    res.status(201).json({
      message: "Invitation created",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, team } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    // EXISTING USER
    const existingUser = await User.findOne({
      email: normalizedEmail,
      organization: req.user.organization,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE USER
    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: role?.toLowerCase() || "user",
      team: team || "Default team",
      organization: req.user.organization,
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Failed to create user",
    });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    if (!token || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await Invite.findOne({ token: hashedToken });

    if (!invite) {
      return res.status(400).json({
        message: "Invalid invite",
      });
    }

    if (invite.expireAt < new Date()) {
      return res.status(400).json({
        message: "Invite expired",
      });
    }

    if (invite.isAccepted) {
      return res.status(400).json({
        message: "Already used",
      });
    }

    const existingUser = await User.findOne({
      email: invite.email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    //Create User
    const user = await User.create({
      email: invite.email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: invite.role,
      organization: invite.organization,
      team: invite.team,
      isVerified: true,
    });

    invite.isAccepted = true;
    await invite.save();

    res.json({
      message: "Account created successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

export const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await Invite.findOne({ token: hashedToken });

    if (!invite) {
      return res.status(400).json({
        message: "Invalid invite",
      });
    }

    if (invite.expireAt < new Date()) {
      return res.status(400).json({
        message: "Invite expired",
      });
    }

    if (invite.isAccepted) {
      return res.status(400).json({
        message: "Already used",
      });
    }

    res.json({
      email: invite.email,
      role: invite.role,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// Pending invite
export const getInvites = async (req, res) => {
  try {
    console.log("ORG:", req.user.organization);

    const invites = await Invite.find({
      organization: req.user.organization,
      isAccepted: { $ne: true },
      expireAt: { $gt: new Date() },
    }).select("email role expireAt");

    res.json(invites);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    const currentUser = req.user;

    if (!role) {
      return res.status(400).json({
        message: "Role is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (role === "owner") {
      return res.status(403).json({
        message: "Cannot assign owner role",
      });
    }

    // Prevent owner change
    if (user.role === "owner") {
      return res.status(400).json({
        message: "Cannot change owner role",
      });
    }

    if (user.role === "admin" && currentUser.role !== "owner") {
      return res.status(403).json({
        message: "Only owner can modify admin roles",
      });
    }

    if (currentUser.role === "admin" && role === "admin") {
      return res.status(403).json({
        message: "Admin cannot assign admin role",
      });
    }

    if (currentUser.role !== "owner" && currentUser.role !== "admin") {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    user.role = role.toLowerCase();
    await user.save();

    res.json({
      message: "Role updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

//Delete users
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("DELETE PARAM ID:", id);

    if (!id || id === "undefined") {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    // First check users collection
    let user = await User.findById(id);

    console.log("FOUND USER:", user);

    if (user) {
      if (user.role === "owner") {
        return res.status(400).json({
          message: "Cannot delete owner",
        });
      }

      await user.deleteOne();

      console.log("USER DELETED");

      return res.json({
        success: true,
        message: "User deleted successfully",
      });
    }

    // Check invites collection
    const invite = await Invite.findById(id);

    console.log("FOUND INVITE:", invite);

    if (invite) {
      await invite.deleteOne();

      console.log("INVITE DELETED");

      return res.json({
        success: true,
        message: "Invite deleted successfully",
      });
    }

    return res.status(404).json({
      message: "User or invite not found",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// Resend Invite
export const resendInvite = async (req, res) => {
  try {
    const { id } = req.body;

    const invite = await Invite.findById(id);

    if (!invite) {
      return res.status(404).json({
        message: "Invite not found",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    invite.token = hashedToken;

    invite.expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await invite.save();

    const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${rawToken}`;

    // SEND EMAIL HERE

    return res.status(200).json({
      message: "Invite resent successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// All Users with invites
export const getAllUsersWithInvites = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const search = req.query.search || "";
    const role = req.query.role || "";
    const team = req.query.team || "";

    const skip = (page - 1) * limit;

    // USER QUERY
    const userQuery = {
      organization: req.user.organization,
    };

    // INVITE QUERY
    const inviteQuery = {
      organization: req.user.organization,
      isAccepted: { $ne: true },
      expireAt: { $gt: new Date() },
    };

    // SEARCH
    if (search) {
      userQuery.$or = [
        {
          firstName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];

      inviteQuery.email = {
        $regex: search,
        $options: "i",
      };
    }

    // ROLE FILTER
    if (role && role !== "All Roles") {
      userQuery.role = role.toLowerCase();

      inviteQuery.role = role.toLowerCase();
    }

    // TEAM FILTER
    if (team && team !== "All Teams") {
      userQuery.team = team;

      inviteQuery.team = team;
    }

    // ACTIVE USERS
    const users = await User.find(userQuery).select("-password");

    // PENDING INVITES
    const invites = await Invite.find(inviteQuery);

    // FORMAT USERS
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        let managedUsersCount = 0;
        let managedTeamsCount = 0;

        if (user.role === "manager") {
          const managedUsersCount = await User.countDocuments({
            manager: user._id,
          });

          const managedTeams = await User.distinct("team", {
            manager: user._id,
            team: { $ne: null },
          });

          return {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            team: user.team,
            status: user.isArchived ? "archived" : "active",
            createdAt: user.createdAt,

            managedUsersCount,
            managedTeamsCount: managedTeams.length,
          };
        }

        return {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          team: user.team,
          status: user.isArchived ? "archived" : "active",
          createdAt: user.createdAt,

          managedUsersCount,
          managedTeamsCount,
        };
      }),
    );

    // FORMAT INVITES
    const formattedInvites = invites.map((invite) => ({
      id: invite._id,
      email: invite.email,
      role: invite.role,
      team: invite.team,
      status: "invited",
      createdAt: invite.createdAt,
      expireAt: invite.expireAt,
    }));

    // MERGE
    const allUsers = [...formattedUsers, ...formattedInvites];

    // SORT LATEST FIRST
    allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // PAGINATION
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    res.json({
      users: paginatedUsers,
      totalUsers: allUsers.length,
      totalPages: Math.ceil(allUsers.length / limit),
      currentPage: page,
      currentUser: req.user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

//Bulk Users invites
export const bulkInvitesUsers = async (req, res) => {
  try {
    const { emails, role, team } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        message: "Emails are required",
      });
    }

    const success = [];
    const failed = [];

    for (const rawEmail of emails) {
      try {
        const email = rawEmail.trim().toLowerCase();

        //Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          failed.push({
            email,
            reason: "Invalid email",
          });

          continue;
        }

        //Check existing User
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          failed.push({
            email,
            reason: "User already exists",
          });

          continue;
        }

        //Check existing invite
        const existingInvite = await Invite.findOne({ email });

        if (existingInvite) {
          failed.push({
            email,
            reason: "Already invited",
          });

          continue;
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");

        // Create invite
        await Invite.create({
          email,
          role: role || "user",
          team,
          token,
          invitedBy: req.user._id,
          organization: req.user.organization,
          expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });

        success.push(email);
      } catch (err) {
        failed.push({
          email: rawEmail,
          reason: "Something went wrong",
        });
      }
    }

    res.status(200).json({
      success,
      failed,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

//Update Users
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { firstName, lastName, team, password } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (firstName !== undefined) {
      user.firstName = firstName;
    }

    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    if (team !== undefined) {
      user.team = team;
    }

    // optional password update
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
    }

    await user.save();

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// Update Users Email
export const updateUserEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: id },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.email = normalizedEmail;

    await user.save();

    res.json({
      message: "Email updated successfully",
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// Email Change Request
export const requestEmailChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { newEmail } = req.body;

    console.log("BODY:", req.body);
    console.log("NEW EMAIL:", newEmail);

    if (!newEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    // Check existing email
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    // Find user
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Delete old requests
    await EmailChange.deleteMany({
      user: user._id,
    });

    // Save pending request
    await EmailChange.create({
      user: user._id,
      newEmail: normalizedEmail,
      token: hashedToken,
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    // TEMP verification link
    const verifyLink = `${process.env.CLIENT_URL}/verify-email-change/${rawToken}`;

    console.log("VERIFY LINK:", verifyLink);

    res.json({
      message: "Verification email sent",
      verifyLink,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

//Verify Mail
export const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const emailChange = await EmailChange.findOne({
      token: hashedToken,
    });

    if (!emailChange) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    if (emailChange.expireAt < new Date()) {
      return res.status(400).json({
        message: "Token expired",
      });
    }

    const user = await User.findById(emailChange.user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.email = emailChange.newEmail;

    await user.save();

    await emailChange.deleteOne();

    res.json({
      message: "Email updated successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
    });
  }
};

//Archive user
export const archiveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "owner") {
      return res.status(400).json({
        message: "Owner cannot be archived",
      });
    }

    user.isArchived = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User archived successfully",
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

//Unarchived User
export const unarchiveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isArchived = false;

    await user.save();

    res.json({
      message: "User unarchived successfully",
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

//Update Invite Roles
export const updateInviteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const { role } = req.body;

    const invite = await Invite.findById(id);

    if (!invite) {
      return res.status(404).json({
        message: "Invite not found",
      });
    }

    invite.role = role.toLowerCase();

    await invite.save();

    res.status(200).json({
      message: "Invite role updated successfully",
      invite,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// User devices
export const getUserDevices = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("devices email");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      email: user.email,
      devices: user.devices,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// Manager Controller
export const assignManager = async (req, res) => {
  try {
    const { userIds = [], teams = [] } = req.body;

    const manager = await User.findById(req.params.id);

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found",
      });
    }

    // FINAL IDS
    const assignedUserIds = new Set(userIds);

    // TEAM USERS
    const validTeams = teams.filter(
      (team) => team.toLowerCase() !== "default team",
    );

    if (validTeams.length > 0) {
      const teamUsers = await User.find({
        organization: req.user.organization,
        team: { $in: validTeams },
      }).select("_id role");

      // ONLY NORMAL USERS
      teamUsers.forEach((u) => {
        if (u._id.toString() !== manager._id.toString()) {
          assignedUserIds.add(u._id.toString());
        }
      });
    }

    // ONLY USERS ROLE
    const validUsers = await User.find({
      organization: req.user.organization,
      _id: {
        $in: [...assignedUserIds],
        $ne: manager._id,
      },
    }).select("_id");

    const validUserIds = validUsers.map((u) => u._id);

    // REMOVE OLD USERS
    await User.updateMany(
      {
        manager: manager._id,
        organization: req.user.organization,
        _id: { $nin: validUserIds },
      },
      {
        $unset: {
          manager: "",
        },
      },
    );

    // ASSIGN NEW USERS
    await User.updateMany(
      {
        organization: req.user.organization,
        _id: { $in: validUserIds },
      },
      {
        $set: {
          manager: manager._id,
        },
      },
    );

    res.status(200).json({
      message: "Manager updated successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Failed to assign manager",
    });
  }
};

// Users CSV
export const exportUsersCsv = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    }).select("-password");

    const formattedUsers = users.map((user) => ({
      "First Name": user.firstName || "",
      "Last Name": user.lastName || "",
      Email: user.email || "",
      Role: user.role || "",
      Team: user.team || "Default team",
      Status: user.isArchived ? "Archived" : "Active",
    }));

    const parser = new Parser();

    const csv = parser.parse(data);

    const hierarchyCsv = parser.parse(formattedUsers);

    res.header("Content-Type", "text/csv");

    res.attachment("users.csv");

    return res.send(hierarchyCsv);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// Hierarchy (Users) CSV
export const exportUsersHierarchy = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    })
      .populate("manager", "firstName lastName email")
      .select("firstName lastName email team manager");

    const data = users.map((user) => ({
      "User Name": `${user.firstName || ""} ${user.lastName || ""}`.trim(),

      "User Email": user.email,

      Team: user.team || "Default team",

      "Manager Name": user.manager
        ? `${user.manager.firstName || ""} ${user.manager.lastName || ""}`.trim()
        : "-",

      "Manager Email": user.manager?.email || "-",
    }));

    const parser = new Parser();

    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");

    res.attachment("hierarchy-users.csv");

    return res.send(csv);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Export failed",
    });
  }
};

// Hierarchy (Managers) CSV
export const exportManagersHierarchy = async (req, res) => {
  try {
    const managers = await User.find({
      organization: req.user.organization,
      role: "manager",
    }).select("firstName lastName email team");

    const data = await Promise.all(
      managers.map(async (manager) => {
        const managedUsers = await User.countDocuments({
          manager: manager._id,
        });

        return {
          "Manager Name":
            `${manager.firstName || ""} ${manager.lastName || ""}`.trim(),

          "Manager Email": manager.email,

          Team: manager.team || "Default team",

          "Managed Users": managedUsers,
        };
      }),
    );

    const parser = new Parser();

    const managersCsv = parser.parse(data);

    res.header("Content-Type", "text/csv");

    res.attachment("hierarchy-managers.csv");

    return res.send(managersCsv);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Export failed",
    });
  }
};

// Devices CSV
export const exportDevices = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    }).select("firstName lastName email devices");

    const data = [];

    users.forEach((user) => {
      if (!user.devices || user.devices.length === 0) {
        data.push({
          "User Name": `${user.firstName || ""} ${user.lastName || ""}`.trim(),

          "User Email": user.email,

          Device: "-",

          OS: "-",

          Browser: "-",

          "Last Active": "-",
        });
      } else {
        user.devices.forEach((device) => {
          data.push({
            "User Name":
              `${user.firstName || ""} ${user.lastName || ""}`.trim(),

            "User Email": user.email,

            Device: device.deviceName || "-",

            OS: device.os || "-",

            Browser: device.browser || "-",

            "Last Active": device.lastActive
              ? new Date(device.lastActive).toLocaleString()
              : "-",
          });
        });
      }
    });

    const parser = new Parser();

    const devicesCsv = parser.parse(data);

    res.header("Content-Type", "text/csv");

    res.attachment("devices.csv");

    return res.send(devicesCsv);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Export failed",
    });
  }
};

// Import Users
export const importUsers = async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        message: "Users array is required",
      });
    }

    const success = [];
    const failed = [];

    const validRoles = ["user", "manager", "admin"];

    for (const row of users) {
      try {
        const email = row.email?.trim().toLowerCase();

        const role = row.role?.trim().toLowerCase() || "user";

        let team = row.team?.trim() || "Default team";

        // EMAIL REQUIRED
        if (!email) {
          failed.push({
            email: "Missing email",
            reason: "Email required",
          });

          continue;
        }

        // VALID EMAIL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          failed.push({
            email,
            reason: "Invalid email",
          });

          continue;
        }

        // VALID ROLE
        if (!validRoles.includes(role)) {
          failed.push({
            email,
            reason: "Invalid role",
          });

          continue;
        }

        // EXISTING USER
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          failed.push({
            email,
            reason: "User already exists",
          });

          continue;
        }

        // EXISTING INVITE
        const existingInvite = await Invite.findOne({
          email,
          isAccepted: false,
        });

        if (existingInvite) {
          failed.push({
            email,
            reason: "Already invited",
          });

          continue;
        }

        // TOKEN
        const rawToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");

        // CREATE INVITE
        await Invite.create({
          email,
          role,
          team,
          token: hashedToken,
          invitedBy: req.user._id,
          organization: req.user.organization,
          expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });

        success.push(email);
      } catch (err) {
        failed.push({
          email: row.email || "Unknown",
          reason: "Import failed",
        });
      }
    }

    return res.status(200).json({
      message: "Import completed",
      imported: success.length,
      failedCount: failed.length,
      success,
      failed,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Import failed",
    });
  }
};

// Export Users
export const exportUsers = async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
    })
      .populate("manager", "email")
      .select("_id firstName lastName email team manager");

    const formattedUsers = users.map((user) => ({
      ID: user._id,

      "First Name": user.firstName || "",

      "Last Name": user.lastName || "",

      Email: user.email || "",

      "Team Name": user.team || "Default team",

      "Direct Managers": user.manager?.email || "",

      Password: "",

      "External ID": "",
    }));

    const parser = new Parser();

    const csv = parser.parse(formattedUsers);

    res.header("Content-Type", "text/csv");

    res.attachment("users.csv");

    return res.send(csv);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Export failed",
    });
  }
};
