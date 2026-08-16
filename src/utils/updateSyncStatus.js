import SyncStatus from "../models/syncStatus.model.js";

export const updateSyncStatus = async (
  userId,
  status = "synced",
  pendingUploads = 0,
) => {
  await SyncStatus.findOneAndUpdate(
    {
      user: userId,
    },
    {
      status,
      lastSync: new Date(),
      pendingUploads,
    },
    {
      new: true,
      upsert: true,
    },
  );
};
