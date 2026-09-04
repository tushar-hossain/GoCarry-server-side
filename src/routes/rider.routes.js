const express = require("express");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { ObjectId } = require("mongodb");
const router = express.Router();

const riderCollection = () => {
  return getDB().collection("riders");
};

const usersCollection = () => {
  return getDB().collection("users");
};

// POST riders
router.post("/", verifyFBToken, async (req, res) => {
  try {
    const {
      name,
      drivingLicenseNumber,
      region,
      district,
      email,
      nid,
      phone,
      bikeBrandModel,
      bikeRegistrationNumber,
      about,
    } = req.body;

    // Get authenticated user information from Firebase
    const uid = req.user.uid;
    const userEmail = req.user.email ?? email;

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    // Required fields
    if (
      !name ||
      !drivingLicenseNumber ||
      !region ||
      !district ||
      !nid ||
      !phone ||
      !bikeBrandModel ||
      !bikeRegistrationNumber
    ) {
      return res.status(400).send({
        success: false,
        message: "Required rider information is missing",
      });
    }

    const collection = riderCollection();

    // Check user already submitted an application
    const existingRider = await collection.findOne({
      uid,
    });

    if (existingRider) {
      return res.status(409).send({
        success: false,
        message: "You have already submitted a rider application",
        data: existingRider,
      });
    }

    const now = new Date()?.toISOString();

    const rider = {
      uid,
      name,
      email: userEmail,
      drivingLicenseNumber,
      region,
      district,
      nid,
      phone,
      bikeBrandModel,
      bikeRegistrationNumber,
      about: about || "",
      status: "pending",
      appliedAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(rider);

    res.status(201).send({
      success: true,
      message: "Rider application submitted successfully",
      data: {
        _id: result.insertedId,
        ...rider,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to submit rider application",
      error: error.message,
    });
  }
});

// Admin: Update Rider Status
router.patch("/status/:id", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const riders = riderCollection();
    const users = usersCollection();

    if (!req.dbUser.uid && req.dbUser.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. you can only promote youeself to admin.",
      });
    }

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid rider ID",
      });
    }

    if (!allowedStatuses?.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid rider status",
      });
    }

    // Find rider
    const rider = await riders.findOne({
      _id: new ObjectId(id),
    });

    if (!rider) {
      return res.status(404).send({
        success: false,
        message: "Rider application not found",
      });
    }

    const now = new Date().toISOString();

    await riders.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
          updatedAt: now,
        },
      },
    );

    let userRole = "user";

    if (status === "approved") {
      userRole = "rider";
    }

    if (status === "rejected") {
      userRole = "user";
    }

    await users.updateOne(
      {
        uid: rider.uid,
      },
      {
        $set: {
          role: userRole,
          updatedAt: now,
        },
      },
    );

    // Get updated rider
    const updatedRider = await riders.findOne({
      _id: new ObjectId(id),
    });

    res.status(200).send({
      success: true,
      message: `Rider ${status} successfully`,
      data: {
        rider: updatedRider,
        role: userRole,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update rider status",
      error: error.message,
    });
  }
});

// Get All Riders

router.get("/", verifyFBToken, async (req, res) => {
  try {
    const collection = riderCollection();
    const riders = await collection.find({}).sort({ _id: -1 }).toArray();

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Riders retrieved successfully",
      data: riders,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve riders",
      error: error.message,
    });
  }
});

// Get Rider By Email
router.get("/:email", verifyFBToken, async (req, res) => {
  try {
    const { email } = req.params;
    const collection = riderCollection();
    const rider = await collection.findOne({
      email,
    });

    if (!rider) {
      return res.status(404).send({
        success: false,
        message: "Rider not found",
      });
    }

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Rider retrieved successfully",
      data: rider,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve rider",
      error: error.message,
    });
  }
});

module.exports = router;
