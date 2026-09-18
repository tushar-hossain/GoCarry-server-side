const { getDB } = require("../config/db");

const notificationCollection = () => {
  return getDB().collection("notifications");
};

const createNotification = async ({
  recipientUid,
  recipientEmail,
  type,
  event,
  title,
  message,
  parcelId,
  trackingId,
}) => {
  return notificationCollection().insertOne({
    recipientUid,
    recipientEmail,
    type,
    event,
    title,
    message,
    parcelId: parcelId?.toString(),
    trackingId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
};

module.exports = {
  createNotification,
};
