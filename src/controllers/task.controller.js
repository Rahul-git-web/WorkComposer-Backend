import Task from "../models/task.model.js";

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const { title, description, priority, status, assignedTo, dueDate } = req.body;

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      assignedTo,
      dueDate,
      assignedBy: req.user._id,
      organization: req.user.organization,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


// GET TASK
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      organization: req.user.organization,
    })
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (err) {
console.log(err);

    res.status(500).json({
      message: err.message,
    });
  }
};


// UPDATE TASK
export const updateTask = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};


// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
