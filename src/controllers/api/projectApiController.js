import Project from "../../models/project.model.js";

export const getProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            organization: req.organization._id,
        }).select("_id name description createdAt updatedAt");

        return res.status(200).json({
            success: true,
            data: projects,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch projects.",
        });
    }
};