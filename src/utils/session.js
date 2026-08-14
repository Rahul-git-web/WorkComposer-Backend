import Session from "../models/session.model.js";

export const checkSessionOverlap = async (userId, startTime, endTime) => {
  return await Session.findOne({
    userId,
    startTime: {
      $lt: endTime,
    },
    endTime: {
      $gt: startTime,
    },
  });
};
