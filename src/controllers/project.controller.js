import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { hasPermission } from "../middleware/permission.middleware.js";

// CREATE PROJECT
export const createProject = async (req, res) => {
  try {
const canManageProjects = await hasPermission(
  req.user,
  "manage_projects"
);

if (!canManageProjects) {
  return res.status(403).json({
    message: "You do not have permission to create projects.",
  });
}

    const { name, teams, users } = req.body;

    const project = await Project.create({
      name,
      teams,
      users,
      organization: req.user.organization,
      createdBy: req.user._id,
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// GET PROJECTS
export const getProjects = async (req, res) => {
  try {
    let defaultProject = await Project.findOne({
      name: "Default Project",
      organization: req.user.organization,
    });

    // CREATE ONLY ONCE
    if (!defaultProject) {
      defaultProject = await Project.create({
        name: "Default Project",
        organization: req.user.organization,
        createdBy: req.user._id,
      });
    }

    // MOVE NULL TASKS TO DEFAULT PROJECT
    await Task.updateMany(
      {
        $or: [{ project: null }, { project: { $exists: false } }],
      },
      {
        project: defaultProject._id,
      },
    );

    const canManageProjects = await hasPermission(req.user, "manage_projects");

    let query = {
      organization: req.user.organization._id || req.user.organization,
    };

    if (!canManageProjects) {
      const accessConditions = [{ users: req.user._id }];

      if (req.user.team) {
        accessConditions.push({
          teams: req.user.team,
        });
      }

      query.$or = accessConditions;
    }

    const projects = await Project.find(query)
      .populate("users", "firstName lastName email")
      .sort({ createdAt: -1 });

   projects.forEach((p) => {
});

    const projectsWithTaskCount = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({
          project: project._id,
        });

        return {
          ...project.toObject(),
          taskCount,
        };
      }),
    );

    res.status(200).json(projectsWithTaskCount);
  } catch (err) {
   console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    const canManageProjects = await hasPermission(req.user, "manage_projects");

    if (!canManageProjects) {
      return res.status(403).json({
        message: "You do not have permission to update projects.",
      });
    }
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    res.status(200).json(updatedProject);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// DELETE PROJECT
export const deleteProject = async (req, res) => {
  try {
    const canManageProjects = await hasPermission(req.user, "manage_projects");

    if (!canManageProjects) {
      return res.status(403).json({
        message: "You do not have permission to delete projects.",
      });
    }
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // DON'T DELETE DEFAULT PROJECT
    if (project.name === "Default Project") {
      return res.status(400).json({
        message: "Default Project cannot be deleted",
      });
    }

    // DELETE TASKS OF PROJECT
    await Task.deleteMany({
      project: project._id,
    });

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
