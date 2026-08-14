import Team from "../models/team.model.js";

export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Team name is required",
      });
    }

    const existingTeam = await Team.findOne({
      name: name.trim(),
      organization: req.user.organization,
    });

    if (existingTeam) {
      return res.status(400).json({
        message: "Team already exists",
      });
    }

    const team = await Team.create({
      name: name.trim(),
      description,
      organization: req.user.organization,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Team created successfully",
      team,
    });
  } catch (err) {
   console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getTeams = async (req, res) => {
  try {
    const organizationId = req.user.organization._id.toString();

    const teams = await Team.find({
      organization: organizationId,
    }).sort({ createdAt: -1 });

    res.status(200).json(teams);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// Update Team
export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Team name is required",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    team.name = name.trim();

    await team.save();

    res.status(200).json({
      message: "Team updated successfully",
      team,
    });
  } catch (err) {
   console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// Delete Team
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    // move users to default team
    await User.updateMany(
      { team: team.name },
      {
        $set: {
          team: "Default team",
        },
      },
    );

    await team.deleteOne();

    res.status(200).json({
      message: "Team deleted successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
