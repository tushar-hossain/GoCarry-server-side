const express = require("express");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const verifyAdmin = require("../middleware/verifyAdmin");
const { ObjectId } = require("mongodb");
const verifyRider = require("../middleware/verifyRider");
const router = express.Router();

const riderCollection = () => {
  return getDB().collection("riders");
};

const usersCollection = () => {
  return getDB().collection("users");
};

const parcelCollection = () => {
  return getDB().collection("parcels");
};

const cashoutCollection = () => {
  return getDB().collection("cashouts");
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

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid rider ID",
      });
    }

    const allowedStatuses = ["pending", "approved", "rejected"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid status. Allowed values: pending, approved, rejected",
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

    const riderResult = await riders.updateOne(
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

    if (riderResult.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Rider status could not be updated",
      });
    }

    let userRole = "user";

    if (status === "approved") {
      userRole = "rider";
    }

    if (status === "pending") {
      userRole = "user";
    }

    if (status === "rejected") {
      userRole = "user";
    }

    const userResult = await users.updateOne(
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

    if (userResult.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Rider status updated, but corresponding user was not found",
      });
    }

    // Get updated rider
    const updatedRider = await riders.findOne({
      _id: new ObjectId(id),
    });

    const updatedUser = await users.findOne({
      uid: rider.uid,
    });

    res.status(200).send({
      success: true,
      message: `Rider ${status} successfully`,
      data: {
        rider: updatedRider,
        user: updatedUser,
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

// Available Riders width district filter
router.get("/available", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    const { district } = req.query;
    const riders = riderCollection();

    if (!req.dbUser.uid && req.dbUser.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. you can only promote youeself to admin.",
      });
    }

    const result = await riders
      .find({ district: district })
      .sort({ appliedAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch riders",
      error: error.message,
    });
  }
});

// assign rides
router.patch(
  "/assign-rider/:parcelId",
  verifyFBToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { parcelId } = req.params;
      const { riderId } = req.body;

      if (!ObjectId.isValid(parcelId) || !ObjectId.isValid(riderId)) {
        return res.status(400).send({
          success: false,
          message: "Invalid parcel or rider ID",
        });
      }

      if (!req.dbUser.uid && req.dbUser.role !== "admin") {
        return res.status(403).send({
          success: false,
          message: "Forbidden. you can only promote youeself to admin.",
        });
      }

      const parcels = parcelCollection();
      const riders = riderCollection();

      // Find parcel
      const parcel = await parcels.findOne({
        _id: new ObjectId(parcelId),
      });

      if (!parcel) {
        return res.status(404).send({
          success: false,
          message: "Parcel not found",
        });
      }

      // Find rider
      const rider = await riders.findOne({
        _id: new ObjectId(riderId),
      });

      if (!rider) {
        return res.status(404).send({
          success: false,
          message: "Rider not found",
        });
      }

      // Check rider approval
      if (rider.status !== "approved") {
        return res.status(400).send({
          success: false,
          message: "Only approved riders can be assigned",
        });
      }

      // Check parcel status
      if (parcel.delivery_Status !== "not_collected") {
        return res.status(400).send({
          success: false,
          message: "This parcel cannot be assigned",
        });
      }

      // Check rider availability
      if (rider.workStatus === "in-delivery") {
        return res.status(400).send({
          success: false,
          message: "This rider is already assigned to a delivery",
        });
      }

      const now = new Date().toISOString();

      // Update parcel
      await parcels.updateOne(
        {
          _id: new ObjectId(parcelId),
        },
        {
          $set: {
            delivery_Status: "assign_rider",
            assignedRiderId: rider._id.toString(),
            assignedRiderUid: rider.uid,
            assignedRiderName: rider.name,
            assignedRiderEmail: rider.email,
            assignedAt: now,
            updatedAt: now,
          },
        },
      );

      // Update rider
      await riders.updateOne(
        {
          _id: new ObjectId(riderId),
        },
        {
          $set: {
            workStatus: "in-delivery",
            updatedAt: now,
          },
        },
      );

      // Get updated parcel
      const updatedParcel = await parcels.findOne({
        _id: new ObjectId(parcelId),
      });

      // Get updated rider
      const updatedRider = await riders.findOne({
        _id: new ObjectId(riderId),
      });

      res.status(200).send({
        success: true,
        message: "Rider assigned successfully",
        data: {
          parcel: updatedParcel,
          rider: updatedRider,
        },
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to assign rider",
        error: error.message,
      });
    }
  },
);

// GET rider delivery tasks
router.get("/delivery-tasks", verifyFBToken, verifyRider, async (req, res) => {
  try {
    const riderEmail = req.user.email;

    if (!riderEmail) {
      return res.status(401).send({
        success: false,
        message: "Rider email not found",
      });
    }

    if (!req.dbUser.uid && req.dbUser.role !== "rider") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. you can only promote youeself to rider.",
      });
    }

    const tasks = await parcelCollection()
      .find({
        assignedRiderEmail: riderEmail,
        delivery_Status: {
          $in: ["assign_rider", "in-transit"],
        },
      })
      .sort({ assignedAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Rider delivery tasks retrieved successfully",
      data: tasks,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve delivery tasks",
      error: error.message,
    });
  }
});

// Update rider delivery tasks status
router.patch(
  "/delivery-tasks/status/:id",
  verifyFBToken,
  verifyRider,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const riderEmail = req.user.email;
      const allowedStatuses = ["in-transit", "delivered"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).send({
          success: false,
          message: "Invalid delivery status",
        });
      }

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

      if (!req.dbUser.uid && req.dbUser.role !== "rider") {
        return res.status(403).send({
          success: false,
          message: "Forbidden. you can only promote youeself to rider.",
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

      // parcel belongs to the logged-in rider
      if (parcel.assignedRiderEmail !== riderEmail) {
        return res.status(403).send({
          success: false,
          message: "You are not assigned to this parcel",
        });
      }

      // Make sure the status transition is valid
      if (
        status === "in-transit" &&
        parcel.delivery_Status !== "assign_rider"
      ) {
        return res.status(400).send({
          success: false,
          message: "Only an assigned parcel can be marked as picked up",
        });
      }

      if (status === "delivered" && parcel.delivery_Status !== "in-transit") {
        return res.status(400).send({
          success: false,
          message: "Only an in-transit parcel can be marked as delivered",
        });
      }

      const now = new Date().toISOString();

      const result = await parcelCollection().updateOne(
        {
          _id: new ObjectId(id),
          assignedRiderEmail: riderEmail,
        },
        {
          $set: {
            delivery_Status: status,
            updatedAt: now,
          },
        },
      );

      if (result.modifiedCount === 0) {
        return res.status(400).send({
          success: false,
          message: "Parcel status was not updated",
        });
      }

      if (status === "delivered") {
        const activeDeliveries = await parcelCollection().countDocuments({
          assignedRiderEmail: riderEmail,
          delivery_Status: {
            $in: ["assign_rider", "in-transit"],
          },
        });

        // No more active deliveries
        if (activeDeliveries === 0) {
          await riderCollection().updateOne(
            { email: riderEmail },
            {
              $set: {
                workStatus: "available",
                updatedAt: now,
              },
            },
          );
        }
      }

      const updatedParcel = await parcelCollection().findOne({
        _id: new ObjectId(id),
      });

      res.status(200).send({
        success: true,
        message:
          status === "in-transit"
            ? "Parcel picked up successfully"
            : "Parcel delivered successfully",
        data: updatedParcel,
      });
    } catch (error) {
      console.error("Update delivery status error:", error);

      res.status(500).send({
        success: false,
        message: "Failed to update delivery status",
        error: error.message,
      });
    }
  },
);

// get completed parcel deliveries rider
router.get(
  "/delivery-tasks/completed",
  verifyFBToken,
  verifyRider,
  async (req, res) => {
    try {
      const riderEmail = req.user.email;

      if (!req.dbUser.uid && req.dbUser.role !== "rider") {
        return res.status(403).send({
          success: false,
          message: "Forbidden. you can only promote youeself to rider.",
        });
      }

      const completedParcels = await parcelCollection()
        .find({
          assignedRiderEmail: riderEmail,
          delivery_Status: {
            $in: ["delivered", "service_center_delivered"],
          },
        })
        .sort({ updatedAt: -1 })
        .toArray();

      const completedParcelsWithCashout = await Promise.all(
        completedParcels?.map(async (parcel) => {
          const cashout = await cashoutCollection().findOne({
            parcelId: parcel._id.toString(),
            riderEmail,
          });

          return {
            ...parcel,
            cashout: cashout
              ? {
                  id: cashout._id,
                  status: cashout.cashoutStatus,
                  amount: cashout.amount,
                  percentage: cashout.percentage,
                  requestedAt: cashout.requestedAt,
                  processedAt: cashout.processedAt,
                }
              : null,
          };
        }),
      );

      res.status(200).send({
        success: true,
        message: "Completed deliveries retrieved successfully",
        data: completedParcelsWithCashout,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to retrieve completed deliveries",
        error: error.message,
      });
    }
  },
);

// get all cashout requests admin
router.get("/cashouts", verifyFBToken, verifyAdmin, async (req, res) => {
  try {
    if (!req.dbUser.uid && req.dbUser.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. you can only promote youeself to rider.",
      });
    }

    const cashouts = await cashoutCollection()
      .find({})
      .sort({ requestedAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Cashout history retrieved successfully",
      data: cashouts,
    });
  } catch (error) {
    console.error("Cashout history error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve cashout history",
      error: error.message,
    });
  }
});

// post rider cashout api
router.post("/cashouts", verifyFBToken, async (req, res) => {
  try {
    const riderEmail = req.user.email;
    const { parcelId } = req.body;

    // Validate parcel ID
    if (!parcelId) {
      return res.status(400).send({
        success: false,
        message: "Parcel ID is required",
      });
    }

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    if (!ObjectId.isValid(parcelId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    // Find completed parcel
    const parcel = await parcelCollection().findOne({
      _id: new ObjectId(parcelId),
      assignedRiderEmail: riderEmail,
      delivery_Status: {
        $in: ["delivered", "service_center_delivered"],
      },
    });

    if (!parcel) {
      return res.status(404).send({
        success: false,
        message:
          "Completed parcel not found or this parcel is not assigned to you",
      });
    }

    // Check duplicate cashout
    const existingCashout = await cashoutCollection().findOne({
      parcelId: parcel._id.toString(),
      riderEmail: riderEmail,
    });

    if (existingCashout) {
      return res.status(409).send({
        success: false,
        message: "Cashout has already been requested for this parcel",
        data: {
          cashoutStatus: existingCashout.cashoutStatus,
        },
      });
    }

    // Delivery cost
    const deliveryCost = Number(parcel.deliveryCost || 0);

    if (deliveryCost <= 0) {
      return res.status(400).send({
        success: false,
        message: "Invalid delivery cost for this parcel",
      });
    }

    // Compare service centers
    const senderCenter = String(parcel.senderServiceCenter || "")
      .trim()
      .toLowerCase();

    const receiverCenter = String(parcel.receiverServiceCenter || "")
      .trim()
      .toLowerCase();

    const sameServiceCenter =
      senderCenter && receiverCenter && senderCenter === receiverCenter;

    // Calculate rider earning
    const percentage = sameServiceCenter ? 80 : 30;
    const cashoutAmount = (deliveryCost * percentage) / 100;

    // Create cashout
    const now = new Date().toISOString();

    const cashoutData = {
      parcelId: parcel._id.toString(),
      trackingId: parcel.trackingId,
      riderId: parcel.assignedRiderId || null,
      riderUid: parcel.assignedRiderUid || null,
      riderEmail: riderEmail,
      riderName: parcel.assignedRiderName || null,
      deliveryCost: deliveryCost,
      senderServiceCenter: parcel.senderServiceCenter || null,
      receiverServiceCenter: parcel.receiverServiceCenter || null,
      serviceCenterType: sameServiceCenter
        ? "same_service_center"
        : "different_service_center",
      percentage: percentage,
      amount: cashoutAmount,
      cashoutStatus: "pending",
      requestedAt: now,
      processedAt: null,
    };

    const result = await cashoutCollection().insertOne(cashoutData);

    res.status(201).send({
      success: true,
      message: "Cashout request submitted successfully",

      data: {
        cashoutId: result.insertedId,
        parcelId: parcel._id,
        trackingId: parcel.trackingId,
        deliveryCost: deliveryCost,
        percentage: percentage,
        amount: cashoutAmount,
        cashoutStatus: "pending",
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create cashout request",
    });
  }
});

// cashouts history api
router.get("/cashouts-history", verifyFBToken, async (req, res) => {
  try {
    const riderEmail = req.user.email;

    if (!riderEmail) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

    const cashouts = await cashoutCollection()
      .find({
        riderEmail: riderEmail,
      })
      .sort({
        requestedAt: -1,
      })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Cashout history retrieved successfully",
      data: cashouts,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve cashout history",
    });
  }
});

router.patch(
  "/cashouts/:id/status",
  verifyFBToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["pending", "approved", "paid", "rejected"];

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid cashout ID",
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).send({
          success: false,
          message: "Invalid cashout status",
        });
      }

      if (!req.dbUser.uid && req.dbUser.role !== "admin") {
        return res.status(403).send({
          success: false,
          message: "Forbidden. you can only promote youeself to admin.",
        });
      }

      const cashout = await cashoutCollection().findOne({
        _id: new ObjectId(id),
      });

      if (!cashout) {
        return res.status(404).send({
          success: false,
          message: "Cashout not found",
        });
      }

      const now = new Date().toISOString();

      const updateData = {
        cashoutStatus: status,
        updatedAt: now,
      };

      if (status === "paid") {
        updateData.processedAt = now;
      }

      await cashoutCollection().updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        },
      );

      const updatedCashout = await cashoutCollection().findOne({
        _id: new ObjectId(id),
      });

      res.status(200).send({
        success: true,
        message: `Cashout ${status} successfully`,
        data: updatedCashout,
      });
    } catch (error) {
      console.error("Cashout status update error:", error);

      res.status(500).send({
        success: false,
        message: "Failed to update cashout status",
      });
    }
  },
);

// Get Rider By Email
router.get("/:email", verifyFBToken, async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(403).send({
        status: false,
        message: "Rider email not found!.",
      });
    }

    if (!req.user.uid) {
      return res.status(403).send({
        success: false,
        message: "Forbidden access.",
      });
    }

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
