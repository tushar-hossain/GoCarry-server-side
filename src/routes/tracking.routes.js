const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const router = express.Router();

const trackingCollection = () => {
  return getDB().collection("tracking");
};

const parcelCollection = () => {
  return getDB().collection("parcels");
};

// Get tracking history
router.get("/:trackingId", verifyFBToken, async (req, res) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId) {
      return res.status(400).send({
        success: false,
        message: "Tracking ID is required",
      });
    }

    const parcel = await parcelCollection().findOne(
      { trackingId },
      {
        projection: {
          _id: 1,
          trackingId: 1,
          parcelName: 1,
          parcelType: 1,
          senderDistrict: 1,
          senderServiceCenter: 1,
          receiverDistrict: 1,
          receiverServiceCenter: 1,
          delivery_Status: 1,
          paymentStatus: 1,
          createdAt: 1,
          creation_date: 1,
          updatedAt: 1,
        },
      },
    );

    if (!parcel) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    const trackingEvents = await trackingCollection()
      .find({ trackingId })
      .sort({ createdAt: 1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Tracking information retrieved successfully",
      data: {
        parcel: {
          trackingId: parcel.trackingId,
          parcelName: parcel.parcelName,
          parcelType: parcel.parcelType,
          senderDistrict: parcel.senderDistrict,
          senderServiceCenter: parcel.senderServiceCenter,
          receiverDistrict: parcel.receiverDistrict,
          receiverServiceCenter: parcel.receiverServiceCenter,
          delivery_Status: parcel.delivery_Status,
          paymentStatus: parcel.paymentStatus,
          createdAt: parcel.createdAt || parcel.creation_date,
          updatedAt: parcel.updatedAt,
        },
        tracking: trackingEvents,
      },
    });
  } catch (error) {
    console.error("Get tracking error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve tracking information",
    });
  }
});

// Add tracking update
router.post("/", verifyFBToken, async (req, res) => {
  try {
    const { parcelId, trackingId, status, title, description, location } =
      req.body;

    if (!parcelId || !trackingId || !status || !title) {
      return res.status(400).send({
        success: false,
        message: "parcelId, trackingId, status and title are required",
      });
    }

    const allowedStatuses = [
      "parcel_submitted",
      "payment_completed",
      "rider_assigned",
      "picked_up",
      "delivered",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid tracking status",
      });
    }

    // Check parcel exists
    const parcel = await parcelCollection().findOne({
      _id: new ObjectId(parcelId),
    });

    if (!parcel) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    const trackingData = {
      parcelId: parcel._id.toString(),
      trackingId: parcel.trackingId,
      status,
      title,
      description: description || "",
      location: location || null,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || "system",
    };

    const result = await trackingCollection().insertOne(trackingData);

    res.status(201).send({
      success: true,
      message: "Tracking event created successfully",
      data: {
        _id: result.insertedId,
        ...trackingData,
      },
    });
  } catch (error) {
    console.error("Create tracking error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create tracking event",
    });
  }
});

module.exports = router;
