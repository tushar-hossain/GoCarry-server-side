const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const router = express.Router();

const userCollection = () => {
  return getDB().collection("users");
};

const notificationCollection = () => {
  return getDB().collection("notifications");
};

router.get("/", verifyFBToken, async (req, res) => {
  try {
    const userUid = req.user.uid;

    const notifications = await notificationCollection()
      .find({
        recipientUid: userUid,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      data: notifications,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
});

router.patch("/read/:id", verifyFBToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userUid = req.user.uid;
    console.log(id);
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const result = await notificationCollection().updateOne(
      {
        _id: new ObjectId(id),
        recipientUid: userUid,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
});

router.patch("/notification-preferences", verifyFBToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const { parcelUpdates, paymentNotifications, promotionalNotifications } =
      req.body;

    const result = await userCollection().updateOne(
      { uid },
      {
        $set: {
          notificationPreferences: {
            parcelUpdates: Boolean(parcelUpdates),
            paymentNotifications: Boolean(paymentNotifications),
            promotionalNotifications: Boolean(promotionalNotifications),
          },

          updatedAt: new Date().toISOString(),
        },
      },
    );

    res.status(200).send({
      success: true,
      message: "Notification preferences updated",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update notification preferences",
    });
  }
});

router.post("/promotion", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).send({
        success: false,
        message: "Title and message are required",
      });
    }

    const users = await userCollection()
      .find({
        "notificationPreferences.promotionalNotifications": true,
      })
      .toArray();

    if (!users.length) {
      return res.status(200).send({
        success: true,
        message: "No users have promotional notifications enabled",
        count: 0,
      });
    }

    const notifications = users?.map((user) => ({
      recipientUid: user.uid,
      recipientEmail: user.email,
      type: "promotion",
      event: "special_offer",
      title,
      message,
      parcelId: null,
      trackingId: null,
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    const result = await notificationCollection().insertMany(notifications);

    res.status(201).send({
      success: true,
      message: "Promotional notification sent",
      count: result.insertedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to send promotional notification",
    });
  }
});

module.exports = router;
