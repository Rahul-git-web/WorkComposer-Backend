import User from "../models/user.model.js";
import Team from "../models/team.model.js";
import Invite from "../models/invite.model.js";
import EmailChange from "../models/emailChange.model.js";
import Organization from "../models/organization.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import sendEmail from "../utils/sendEmail.js";
import inviteEmailTemplate from "../templates/inviteEmailTemplate.js";
import { getAvatarUrl } from "../utils/avatar.js";
import {
  auditSettingsChanged,
  auditUserCreated,
  auditRoleChanged,
  auditUserArchived,
  auditUserRestored,
} from "../utils/auditService.js";
import Role from "../models/role.model.js";

export const getUsers = async (req, res) => {
  try {
    const currentUser = req.user;

    let users;

    //ROLE-BASED logic
    if (currentUser.role === "owner") {
      // OWNER = see all users in organization

      users = await User.find({
        organization: currentUser.organization,
      })
        .populate("team", "name")
        .select("-password");
    } else if (currentUser.role === "admin") {
      // ADMIN = all except owner
      users = await User.find({
        organization: currentUser.organization,
        role: { $ne: "owner" },
      })
        .populate("team", "name")
        .select("-password -refreshToken");
    } else if (currentUser.role === "manager") {
      // MANAGER = self + managed users

      users = await User.find({
        organization: currentUser.organization,
        $or: [{ _id: currentUser._id }, { manager: currentUser._id }],
      })
        .populate("team", "name")
        .select("-password -refreshToken");
    } else {
      //USER = only self
      users = await User.find({
        _id: currentUser._id,
      })
        .populate("team", "name")
        .select("-password -refreshToken");
    }

    const userWithStats = await Promise.all(
      users.map(async (user) => {
        if (user.role !== "manager") {
          return {
            ...user.toObject(),
            avatar: getAvatarUrl(user.avatar),
            managedUsersCount: 0,
            managedTeamsCount: 0,
          };
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
          avatar: getAvatarUrl(user.avatar),
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

    // -----------------------------
    // 1. Validate required fields
    // -----------------------------
    if (!email || !role || !team) {
      return res.status(400).json({
        message: "Email, role and team are required",
      });
    }

    // -----------------------------
    // 2. Normalize email
    // -----------------------------
    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------
    // 3. Validate email format
    // -----------------------------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    // -----------------------------
    // 4. Prevent self invitation
    // -----------------------------
    if (normalizedEmail === req.user.email.trim().toLowerCase()) {
      return res.status(400).json({
        message: "You cannot invite yourself",
      });
    }

    // -----------------------------
    // 5. Check existing user
    // -----------------------------
    const existingUser = await User.findOne({
      email: normalizedEmail,
      organization: req.user.organization,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // -----------------------------
    // 6. Check existing active invite
    // -----------------------------
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

    // -----------------------------
    // 7. Validate team
    // -----------------------------
    const teamExists = await Team.findOne({
      _id: team,
      organization: req.user.organization,
    });

    if (!teamExists) {
      return res.status(400).json({
        message: "Invalid team",
      });
    }

    // -----------------------------
    // 8. Generate secure token
    // -----------------------------
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // -----------------------------
    // 9. Create invitation
    // -----------------------------
    const invite = await Invite.create({
      email: normalizedEmail,
      role,
      team: teamExists._id,
      token: hashedToken,
      invitedBy: req.user._id,
      organization: req.user.organization,
      expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    try {
      // -----------------------------
      // 10. Generate invitation link
      // -----------------------------
      const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${rawToken}`;

      // -----------------------------
      // 11. Generate email
      // -----------------------------
      const html = inviteEmailTemplate({
        inviteLink,
        organization: req.user.organization,
        role,
        team: teamExists.name,
      });

      // -----------------------------
      // 12. Send email
      // -----------------------------
      await sendEmail(normalizedEmail, "You're invited to WorkComposer", html);
    } catch (emailError) {
      // Email failed → remove the invitation
      await Invite.findByIdAndDelete(invite._id);

      console.error("INVITATION EMAIL FAILED:", emailError);

      return res.status(500).json({
        message: "Invitation could not be sent. Please try again.",
      });
    }

    // -----------------------------
    // 13. Success
    // -----------------------------
    return res.status(201).json({
      message: "Invitation sent successfully",
    });
  } catch (err) {
    console.error("INVITE USER ERROR:", err);

    return res.status(500).json({
      message: "Server error",
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

    const roleName =
      (role?.toLowerCase() || "user").charAt(0).toUpperCase() +
      (role?.toLowerCase() || "user").slice(1);

    const roleDoc = await Role.findOne({
      organization: req.user.organization,
      name: roleName,
    });

    // Find the default team if no team is selected
    let teamId = team;

    if (!teamId) {
      const defaultTeam = await Team.findOne({
        organization: req.user.organization,
        name: "Default team",
      });

      teamId = defaultTeam?._id || null;
    }

    // CREATE USER
    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: role?.toLowerCase() || "user",
      roleRef: roleDoc?._id,
      team: teamId,
      organization: req.user.organization,
      isVerified: true,
    });

    await auditUserCreated({
      req,
      createdUser: user,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (err) {
    console.error(err);

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
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await Invite.findOne({
      token: hashedToken,
    });

    if (!invite) {
      return res.status(400).json({
        message: "Invalid invite",
      });
    }

    if (invite.isAccepted) {
      return res.status(400).json({
        message: "Invitation has already been used",
      });
    }

    if (invite.expireAt < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    const existingUser = await User.findOne({
      email: invite.email.toLowerCase(),
      organization: invite.organization,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: invite.email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: invite.role,
      organization: invite.organization,
      team: invite.team,
      isVerified: true,
    });

    invite.isAccepted = true;
    await invite.save();

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("ACCEPT INVITE ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await Invite.findOne({
      token: hashedToken,
    }).populate("team", "name");

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
      team: invite.team?.name || "Team",
    });
  } catch (err) {
    console.error("GET INVITE DETAILS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Pending invite
export const getInvites = async (req, res) => {
  try {
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

    const previousRole = user.role;

    user.role = role.toLowerCase();
    await user.save();

    await auditRoleChanged({
      req,
      user,
      previousRole,
      newRole: user.role,
    });

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

    if (!id || id === "undefined") {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    // First check users collection
    let user = await User.findById(id);

    if (user) {
      if (user.role === "owner") {
        return res.status(400).json({
          message: "Cannot delete owner",
        });
      }

      await user.deleteOne();

      return res.json({
        success: true,
        message: "User deleted successfully",
      });
    }

    // Check invites collection
    const invite = await Invite.findById(id);

    if (invite) {
      await invite.deleteOne();

      return res.json({
        success: true,
        message: "Invite deleted successfully",
      });
    }

    return res.status(404).json({
      message: "User or invite not found",
    });
  } catch (err) {
    console.error(err);

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
    console.error(err);

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
      const selectedTeam = await Team.findOne({
        organization: req.user.organization,
        name: team,
      });

      if (selectedTeam) {
        userQuery.team = selectedTeam._id;
        inviteQuery.team = team;
      } else {
        userQuery.team = null;
      }
    }

    // ACTIVE USERS
    const users = await User.find(userQuery)
      .populate("team", "name")
      .select("-password");

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
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatar: getAvatarUrl(user.avatar),
            role: user.role,
            team: user.team?.name || "",
            status: user.isArchived ? "archived" : "active",
            createdAt: user.createdAt,
            devices: user.devices || [],
            managedUsersCount,
            managedTeamsCount: managedTeams.length,
          };
        }

        return {
          id: user._id,
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: getAvatarUrl(user.avatar),
          role: user.role,
          team: user.team?.name || "",
          status: user.isArchived ? "archived" : "active",
          createdAt: user.createdAt,
          devices: user.devices || [],
          managedUsersCount,
          managedTeamsCount,
        };
      }),
    );
    

    // FORMAT INVITES
    const formattedInvites = invites.map((invite) => ({
      id: invite._id,
      _id: invite._id,
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
    console.error(err);

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

    if (!role) {
      return res.status(400).json({
        message: "Role is required",
      });
    }

    if (!team) {
      return res.status(400).json({
        message: "Team is required",
      });
    }

    // Validate team belongs to current organization
    const selectedTeam = await Team.findOne({
      _id: team,
      organization: req.user.organization,
    });

    if (!selectedTeam) {
      return res.status(400).json({
        message: "Invalid team",
      });
    }

    const success = [];
    const failed = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const normalizedEmails = [
      ...new Set(
        emails.map((email) => email.trim().toLowerCase()).filter(Boolean),
      ),
    ];

    for (const email of normalizedEmails) {
      try {
        // -----------------------------
        // Email validation
        // -----------------------------
        if (!emailRegex.test(email)) {
          failed.push({
            email,
            reason: "Invalid email",
          });

          continue;
        }

        // -----------------------------
        // Prevent self invitation
        // -----------------------------
        if (email === req.user.email.toLowerCase().trim()) {
          failed.push({
            email,
            reason: "You cannot invite yourself",
          });

          continue;
        }

        // -----------------------------
        // Existing user
        // -----------------------------
        const existingUser = await User.findOne({
          email,
          organization: req.user.organization,
        });

        if (existingUser) {
          failed.push({
            email,
            reason: "User already exists",
          });

          continue;
        }

        // -----------------------------
        // Existing active invitation
        // -----------------------------
        const existingInvite = await Invite.findOne({
          email,
          organization: req.user.organization,
          isAccepted: false,
          expireAt: { $gt: new Date() },
        });

        if (existingInvite) {
          failed.push({
            email,
            reason: "Invite already sent",
          });

          continue;
        }

        // -----------------------------
        // Generate secure token
        // -----------------------------
        const rawToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");

        // -----------------------------
        // Create invitation
        // -----------------------------
        const invite = await Invite.create({
          email,
          role,
          team: selectedTeam._id,
          token: hashedToken,
          invitedBy: req.user._id,
          organization: req.user.organization,
          expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        });

        try {
          // -----------------------------
          // Generate invitation URL
          // -----------------------------
          const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${rawToken}`;

          // -----------------------------
          // Generate email
          // -----------------------------
          const html = inviteEmailTemplate({
            inviteLink,
            organization: req.user.organization,
            role,
            team: selectedTeam._id,
          });

          // -----------------------------
          // Send invitation email
          // -----------------------------
          await sendEmail(email, "You're invited to WorkComposer", html);

          success.push(email);
        } catch (emailError) {
          console.error(`INVITATION EMAIL FAILED FOR ${email}:`, emailError);

          // Don't leave a dead invitation
          // if the email wasn't actually sent.
          await Invite.findByIdAndDelete(invite._id);

          failed.push({
            email,
            reason: "Failed to send invitation email",
          });
        }
      } catch (err) {
        console.error(`BULK INVITE FAILED FOR ${email}:`, err);

        failed.push({
          email,
          reason: "Something went wrong",
        });
      }
    }

    return res.status(200).json({
      success,
      failed,
    });
  } catch (err) {
    console.error("BULK INVITE ERROR:", err);

    return res.status(500).json({
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
    console.error(err);

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
    console.error(err);

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

    res.json({
      message: "Verification email sent",
      verifyLink,
    });
  } catch (err) {
    console.error(err);

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
    console.error(err);

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

    await auditUserArchived({
      req,
      user,
    });

    res.status(200).json({
      success: true,
      message: "User archived successfully",
      user,
    });
  } catch (err) {
    console.error(err);

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

    await auditUserRestored({
      req,
      user,
    });

    res.json({
      message: "User unarchived successfully",
      user,
    });
  } catch (err) {
    console.error(err);

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
    console.error(err);

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

    const latestDevice = [...(user.devices || [])].sort((a, b) => {
      const aTime = a.lastSync ? new Date(a.lastSync).getTime() : 0;

      const bTime = b.lastSync ? new Date(b.lastSync).getTime() : 0;

      return bTime - aTime;
    })[0];

    res.status(200).json({
      email: user.email,
      devices: latestDevice ? [latestDevice] : [],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const registerUserDevice = async (req, res) => {
  try {
    const { deviceId, platform, appVersion, hostname } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        message: "Device ID is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingDevice = user.devices.find(
      (device) => device.deviceId === deviceId,
    );

    if (existingDevice) {
      existingDevice.platform = platform || existingDevice.platform;
      existingDevice.appVersion = appVersion || existingDevice.appVersion;
      existingDevice.hostname = hostname || existingDevice.hostname;

      existingDevice.ip =
        req.ip || req.headers["x-forwarded-for"] || existingDevice.ip;

      existingDevice.lastSync = new Date();
      existingDevice.isOnline = true;
    } else {
      user.devices.push({
        deviceId,
        ip: req.ip || req.headers["x-forwarded-for"] || "Unknown IP",
        location: "Unknown",
        platform: platform || "Unknown",
        appVersion: appVersion || "Unknown",
        hostname: hostname || "",
        loginTime: new Date(),
        lastSync: new Date(),
        isOnline: true,
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: existingDevice
        ? "Device updated successfully"
        : "Device registered successfully",
    });
  } catch (err) {
    console.error("REGISTER DEVICE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const logoutUserDevice = async (req, res) => {
  try {
    const { id, deviceId } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const device = user.devices.find((device) => device.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    device.isOnline = false;
    device.lastSync = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Device signed out successfully",
    });
  } catch (err) {
    console.error("LOGOUT DEVICE ERROR:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

export const checkUserDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const user = await User.findById(req.user._id).select("devices");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const device = user.devices.find((device) => device.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({
        authorized: false,
        message: "Device not found",
      });
    }

    return res.json({
      authorized: device.isOnline === true,
      isOnline: device.isOnline,
    });
  } catch (err) {
    console.error("CHECK DEVICE ERROR:", err);

    return res.status(500).json({
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
    if (teams.length > 0) {
      const teamDocs = await Team.find({
        organization: req.user.organization,
        name: { $in: teams },
      }).select("_id");

      const teamIds = teamDocs.map((team) => team._id);

      const teamUsers = await User.find({
        organization: req.user.organization,
        team: { $in: teamIds },
      }).select("_id");

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
    console.error(err);

    res.status(500).json({
      message: "Failed to assign manager",
    });
  }
};

// Manager Assignment Controller
export const getManagerAssignments = async (req, res) => {
  try {
    const manager = await User.findById(req.params.id);

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found",
      });
    }

    // Users assigned to this manager
    const users = await User.find({
      organization: req.user.organization,
      manager: manager._id,
    })
      .populate("team", "name")
      .select("_id team");

    const userIds = users.map((u) => u._id);

    const teams = [...new Set(users.map((u) => u.team?.name).filter(Boolean))];

    res.json({
      userIds,
      teams,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch manager assignments",
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
    console.error(err);

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
    console.error(err);

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
    console.error(err);

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
    console.error(err);

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
    console.error(err);

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
    console.error(err);

    res.status(500).json({
      message: "Export failed",
    });
  }
};

const isEqual = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const updateUserSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { module, setting, value } = req.body;

    const moduleSettings = {
      appUpdate: ["automaticUpdates", "forceUpdates"],

      tracking: [
        "trackingMode",
        "startTrackingOnBoot",
        "allowWorkAwayFromComputer",
        "pauseTrackingWhenInactive",
        "inactivityMinutes",
        "continueTrackingDuringSleep",
        "sleepBreakHours",
        "sleepBreakMinutes",
        "displayBackToWorkReminder",
        "stopTrackingWithoutInternet",
        "statusBarVisibility",
        "applicationTracking",
        "ipTracking",
      ],

      screenCapture: ["enabled", "screenshotFrequency", "blurScreenshots"],

      manualTime: [
        "allowManualTime",
        "requireApproval",
        "managerApproval",
        "backdatingLimit",
        "requireProjectTask",
      ],

      shift: ["autoStartTracking", "autoStopTracking", "schedule"],

      emailReports: [
        "weeklyTrackingReports",
        "dailyTrackingReports",

        "dailyWarningEmails",
        "dailyBasedOnShift",
        "dailyMinimumTime",
        "dailyWeekDays",

        "weeklyWarningEmails",
        "weeklyBasedOnShift",
        "weeklyMinimumTime",

        "idlePercentageEnabled",
        "idlePercentage",
      ],
    };

    if (!moduleSettings[module] || !moduleSettings[module].includes(setting)) {
      return res.status(400).json({
        message: "Invalid setting",
      });
    }

    const userSettingFields = {
      appUpdate: "appUpdateSettings",
      tracking: "trackingSettings",
      screenCapture: "screenCaptureSettings",
      manualTime: "manualTimeSettings",
      shift: "shiftSettings",
      emailReports: "emailReportSettings",
    };

    const user = await User.findOne({
      _id: id,
      organization: req.user.organization,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const userField = userSettingFields[module];

    if (!user[userField]) {
      user[userField] = {};
    }

    // If user selected the same value as the organization,
    // remove the override and inherit the organization setting.

    const organizationFields = {
      appUpdate: "appUpdates",
      tracking: "tracking",
      screenCapture: "screenCapture",
      manualTime: "manualTime",
      shift: "shift",
      emailReports: "emailReports",
    };

    const organization = await Organization.findById(req.user.organization);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const organizationField = organizationFields[module];

    if (!organizationField) {
      return res.status(400).json({
        message: "Invalid module",
      });
    }

    let organizationValue = organization[organizationField]?.[setting];

    if (module === "shift" && setting === "schedule") {
      const timeTrackingSettings = await TimeTrackingSettings.findOne({
        organization: req.user.organization,
      });

      organizationValue = timeTrackingSettings?.shift?.schedule;
    }

    const previousValue =
      user[userField]?.[setting] === null ||
      user[userField]?.[setting] === undefined
        ? organizationValue
        : user[userField][setting];

    if (isEqual(value, organizationValue)) {
      user[userField][setting] = null;
    } else {
      user[userField][setting] = value;
    }
    await user.save();

    await auditSettingsChanged({
      req,
      setting,
      previousValue,
      newValue: value,
      affectedUser: user,
    });

    res.status(200).json({
      message: "User setting updated successfully",
      settings: {
        [module]: user[userField],
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to update user setting",
    });
  }
};

export const updateUserShiftSettings = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { autoStartTracking, autoStopTracking, schedule } = req.body;

    if (!user.shiftSettings) {
      user.shiftSettings = {};
    }

    if (autoStartTracking !== undefined) {
      user.shiftSettings.autoStartTracking = autoStartTracking;
    }

    if (autoStopTracking !== undefined) {
      user.shiftSettings.autoStopTracking = autoStopTracking;
    }

    if (schedule !== undefined) {
      if (schedule === null) {
        user.set("shiftSettings.schedule", undefined);
        user.markModified("shiftSettings");
      } else {
        user.shiftSettings.schedule = schedule;
      }
    }
    await user.save();

    return res.status(200).json({
      message: "User shift settings updated successfully",
      shiftSettings: user.shiftSettings,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
