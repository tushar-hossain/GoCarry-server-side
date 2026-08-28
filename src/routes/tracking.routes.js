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

// Add tracking update
router.post("/", async (req, res) => {
  try {
    const { parcelId, trackingId, status, title, description, location } =
      req.body;

    if (!parcelId || !trackingId || !status || !title) {
      return res.status(400).send({
        success: false,
        message: "Required tracking information is missing",
      });
    }

    if (!ObjectId.isValid(parcelId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    // Check parcel
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
      parcelId: new ObjectId(parcelId),
      trackingId,
      status,
      title,
      description: description || "",
      location: location || null,
      createdAt: new Date().toISOString(),
    };

    const result = await trackingCollection().insertOne(trackingData);

    res.status(201).send({
      success: true,
      message: "Tracking update added successfully",
      data: {
        insertedId: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create tracking error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add tracking update",
      error: error.message,
    });
  }
});

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

    const trackingUpdates = await trackingCollection()
      .find({
        trackingId,
      })
      .sort({
        createdAt: 1,
      })
      .toArray();

    if (trackingUpdates?.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Tracking information not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Tracking information retrieved successfully",
      data: trackingUpdates,
    });
  } catch (error) {
    console.error("Get tracking error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve tracking information",
      error: error.message,
    });
  }
});

module.exports = router;
