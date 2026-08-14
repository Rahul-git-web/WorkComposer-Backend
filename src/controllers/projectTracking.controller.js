import ProjectTracking from "../models/projectTracking.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import { getAvatarUrl } from "../utils/avatar.js";
import { hasPermission } from "../middleware/permission.middleware.js";

export const trackProject = async (req, res) => {
  try {
    const { projectId, taskId, startTime, endTime, duration } = req.body;

    const date = new Date(startTime).toISOString().split("T")[0];

    const tracking = await ProjectTracking.create({
      user: req.user._id,

      project: projectId,

      task: taskId || null,

      startTime,

      endTime,

      duration,

      date,
    });

    res.status(201).json({
      success: true,
      tracking,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getProjectTracking = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = "name", order = "asc" } = req.query;

    const canManageProjects = await hasPermission(req.user, "manage_projects");

    const projectQuery = {
      organization: req.user.organization,
    };

    if (!canManageProjects) {
      const accessConditions = [
        {
          users: req.user._id,
        },
      ];

      if (req.user.team) {
        accessConditions.push({
          teams: req.user.team,
        });
      }

      projectQuery.$or = accessConditions;
    }

    if (req.query.teams?.trim()) {
      projectQuery.teams = {
        $in: req.query.teams.split(",").filter(Boolean),
      };
    }

    if (req.query.users?.trim()) {
      projectQuery.users = {
        $in: req.query.users.split(",").filter(Boolean),
      };
    }

    const projects = await Project.find(projectQuery).populate(
      "users",
      "firstName lastName email",
    );

    const data = await Promise.all(
      projects.map(async (project) => {
        const query = {
          project: project._id,
        };

        if (!canManageProjects) {
          query.user = req.user._id;
        }

        if (canManageProjects && req.query.users?.trim()) {
          query.user = {
            $in: req.query.users.split(",").filter(Boolean),
          };
        }

        if (startDate && endDate) {
          query.date = {
            $gte: startDate,
            $lte: endDate,
          };
        }

        const records = await ProjectTracking.find(query)
          .populate("user", "firstName lastName email")
          .populate("task", "title");

        records.forEach((r) => {
        });

        const taskMap = new Map();

        for (const record of records) {
          if (!record.task) continue;

          const key = `${record.task._id}-${record.user._id}`;

          if (!taskMap.has(key)) {
            taskMap.set(key, {
              _id: key,
              task: record.task,
              user: record.user,
              duration: 0,
            });
          }

          taskMap.get(key).duration += record.duration || 0;
        }

        const taskRecords = Array.from(taskMap.values());

        const totalSeconds = records.reduce(
          (sum, item) => sum + (item.duration || 0),
          0,
        );

        return {
          _id: project._id,

          name: project.name,

          users: project.users,

          totalSeconds,

          records: taskRecords,
        };
      }),
    );

    const filteredData = data.filter((project) => project.records.length > 0);

    filteredData.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "duration":
          comparison = a.totalSeconds - b.totalSeconds;
          break;

        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return order === "asc" ? comparison : -comparison;
    });

    res.json(filteredData);
  } catch (err) {
  console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};

export const getTaskDetails = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { startDate, endDate } = req.query;

    const canManageProjects = await hasPermission(req.user, "manage_projects");

    const query = {
      task: taskId,
    };

    if (!canManageProjects) {
      query.user = req.user._id;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const records = await ProjectTracking.find(query).populate(
      "user",
      "firstName lastName avatar email",
    );

    const userMap = new Map();

    for (const record of records) {
      const key = record.user._id.toString();

      if (!userMap.has(key)) {
        userMap.set(key, {
          user: {
            ...record.user.toObject(),
            avatar: getAvatarUrl(record.user.avatar),
          },
          duration: 0,
        });
      }

      userMap.get(key).duration += record.duration || 0;
    }

    res.json(Array.from(userMap.values()));
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
};
