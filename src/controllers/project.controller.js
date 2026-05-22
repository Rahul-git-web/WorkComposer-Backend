import Project from "../models/project.model.js";

// CREATE PROJECT
export const createProject = async (req, res) => {
  try {
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
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// GET PROJECTS
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      organization: req.user.organization,
    })
      .populate("users", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    res.status(200).json(updatedProject);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// DELETE PROJECT
export const deleteProject = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
