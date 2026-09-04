const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");

const router = express.Router();

const parcelCollection = () => {
  return getDB().collection("parcels");
};

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
router.post("/", async (req, res) => {
  try {
    const parcelData = req.body;
    const result = await parcelCollection().insertOne(parcelData);

    res.status(201).send({
      success: true,
      message: "Parcel created successfully",
      result,
    });
  } catch (error) {
    console.error("Create parcel error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create parcel",
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
