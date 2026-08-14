const syncingTasks = new Map();

export const markAsanaSync = (taskId) => {
  syncingTasks.set(taskId, Date.now());

  setTimeout(() => {
    syncingTasks.delete(taskId);
  }, 10000);
};

export const isAsanaSyncing = (taskId) => {
  return syncingTasks.has(taskId);
};
