import User from "../models/user.model.js";
import Invite from "../models/invite.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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

    res.status(200).json(users);
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
      isAccepted: false,
      expireAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return res.status(400).json({
        message: "Invite already sent",
      });
    }

    //Check if already existing
    const existingUser = await User.findOne({ email: normalizedEmail });

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
    const inviteLink = `http://localhost:3000/accept-invite?token=${rawToken}`;

    res.status(201).json({
      message: "Invitation created",
      inviteLink, // TEMP (for testing)
    });

    //TODO: later = send email with invite link
    // For now just simulate

    // res.status(200).json({
    //   message: "Invitation sent successfully",
    //   email,
    //   role,
    // });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: err.message,
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

    user.role = role;
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

    console.log("EMAIL RECIEVED:", id);

    const invite = await Invite.findById(id);

    if (!invite) {
      return res.status(404).json({
        message: "Invite not found",
      });
    }

    res.status(200).json({
      message: "Invite resent successfully",
    });

    //Generate new token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    invite.token = hashedToken;
    invite.expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await invite.save();

    const inviteLink = `http://localhost:3000/accept-invite?token=${rawToken}`;

    res.json({
      message: "Invite resent",
      inviteLink,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

// All Users with invites
export const getAllUsersWithInvites = async (req, res) => {
  try {
    //Active users
    const users = await User.find({
      organization: req.user.organization,
    }).select("-password");

    // Pending invites
    const invites = await Invite.find({
      organization: req.user.organization,
      isAccepted: { $ne: true },
      expireAt: { $gt: new Date() },
    });

    // Format users
    const formattedUsers = users.map((user) => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: "active",
    }));

    // Format invites
    const formattedInvites = invites.map((invite) => ({
      id: invite._id,
      email: invite.email,
      role: invite.role,
      status: "invited",
    }));

    // Merge both
    const allUsers = [...formattedUsers, ...formattedInvites];

    res.json(allUsers);
  } catch (err) {
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
        const emailRegex = /^[^|s@]+@[^|s@]+|.[^|s@]+$/;

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
