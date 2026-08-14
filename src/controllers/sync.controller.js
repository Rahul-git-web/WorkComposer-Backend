import SyncStatus from "../models/syncStatus.model.js";

export const getSyncStatus = async (req, res) => {
  try {
    let sync = await SyncStatus.findOne({
      user: req.user._id,
    });

    if (!sync) {
      sync = await SyncStatus.create({
        user: req.user._id,
      });
    }

    res.json(sync);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
