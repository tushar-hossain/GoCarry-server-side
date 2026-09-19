const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const { createNotification } = require("../utils/createNotification");

const router = express.Router();

const parcelCollection = () => {
  return getDB().collection("parcels");
};

const trackingCollection = () => getDB().collection("tracking");

// GET all parcels
router.get("/", verifyFBToken, async (req, res) => {
  try {
    const { email } = req.query;

    const query = email
      ? {
          created_by: email,
        }
      : {};

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    const parcels = await parcelCollection()
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Parcel get successfully",
      parcels,
    });
  } catch (error) {
    console.error("Get parcels error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve parcels",
      error: error.message,
    });
  }
});

// Get Single Parcel
router.get("/:id", verifyFBToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    const parcel = await parcelCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!parcel) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Parcel retrieved successfully",
      data: parcel,
    });
  } catch (error) {
    console.error("Get single parcel error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve parcel",
      error: error.message,
    });
  }
});

// POST parcel
router.post("/", verifyFBToken, async (req, res) => {
  try {
    const parcelData = req.body;
    const result = await parcelCollection().insertOne(parcelData);

    await trackingCollection().insertOne({
      parcelId: result.insertedId.toString(),
      trackingId: parcelData.trackingId,
      status: "parcel_submitted",
      title: "Parcel Submitted",
      description: "Your parcel has been submitted successfully.",
      location: {
        district: parcelData.senderDistrict,
        serviceCenter: parcelData.senderServiceCenter,
      },
      createdAt: new Date().toISOString(),
      createdBy: req.user.email,
    });

    await createNotification({
      recipientUid: req.user.uid,
      recipientEmail: req.user.email,
      type: "parcel",
      event: "parcel_created",
      title: "Parcel Created",
      message: `Your parcel ${parcelData.parcelName} has been successfully created.`,
      parcelId: result.insertedId,
      trackingId: parcelData.trackingId,
    });

    res.status(201).send({
      success: true,
      message: "Parcel created successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create parcel",
      error: error.message,
    });
  }
});

// update single parcels
router.patch("/:id", verifyFBToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    const {
      parcelType,
      parcelName,
      parcelWeight,
      senderName,
      senderPhone,
      senderDistrict,
      senderServiceCenter,
      senderAddress,
      pickupInstruction,
      receiverName,
      receiverPhone,
      receiverDistrict,
      receiverServiceCenter,
      receiverAddress,
      deliveryInstruction,
      deliveryCost,
    } = req.body;

    const result = await parcelCollection().updateOne(
      {
        _id: new ObjectId(id),
        created_by: userEmail,
        delivery_Status: "not_collected",
      },
      {
        $set: {
          parcelType,
          parcelName,
          parcelWeight,
          senderName,
          senderPhone,
          senderDistrict,
          senderServiceCenter,
          senderAddress,
          pickupInstruction,
          receiverName,
          receiverPhone,
          receiverDistrict,
          receiverServiceCenter,
          receiverAddress,
          deliveryInstruction,
          deliveryCost,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Parcel updated successfully",
    });
  } catch (error) {
    console.error("Update parcel error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update parcel",
      error: error.message,
    });
  }
});

// DELETE parcel
router.delete("/:id", verifyFBToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    const result = await parcelCollection().deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Parcel deleted successfully",
    });
  } catch (error) {
    console.error("Delete parcel error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete parcel",
      error: error.message,
    });
  }
});

module.exports = router;
