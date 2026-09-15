const express = require("express");
const { getDB } = require("../config/db");
const verifyFBToken = require("../middleware/verifyFBToken");
const verifyRider = require("../middleware/verifyRider");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

const parcelCollection = () => {
  return getDB().collection("parcels");
};

const paymentCollection = () => {
  return getDB().collection("payments");
};

const cashoutCollection = () => {
  return getDB().collection("cashouts");
};

const riderCollection = () => {
  return getDB().collection("riders");
};

const usersCollection = () => {
  return getDB().collection("users");
};

router.get("/user", verifyFBToken, async (req, res) => {
  try {
    const email = req.user.email;

    const parcels = await parcelCollection()
      .aggregate([
        {
          $match: {
            created_by: email,
          },
        },

        {
          $facet: {
            statistics: [
              {
                $group: {
                  _id: null,
                  totalParcels: { $sum: 1 },

                  pendingParcels: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            "$delivery_Status",
                            ["not_collected", "assign_rider"],
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  inTransit: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$delivery_Status", "in-transit"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  delivered: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            "$delivery_Status",
                            ["delivered", "service_center_delivered"],
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],

            recentParcels: [
              {
                $sort: {
                  creation_date: -1,
                },
              },
              {
                $limit: 5,
              },
              {
                $project: {
                  _id: 1,
                  parcelName: 1,
                  trackingId: 1,
                  parcelType: 1,
                  deliveryCost: 1,
                  paymentStatus: 1,
                  delivery_Status: 1,
                  receiverName: 1,
                  receiverDistrict: 1,
                  receiverServiceCenter: 1,
                  creation_date: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const result = parcels[0];

    // Calculate successful payment amount
    const paymentResult = await paymentCollection()
      .aggregate([
        {
          $match: {
            created_by: email,
            paymentStatus: "succeeded",
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: {
              $sum: "$amount",
            },
          },
        },
      ])
      .toArray();

    const totalSpent = paymentResult[0]?.totalSpent || 0;

    res.status(200).send({
      success: true,
      data: {
        statistics: result.statistics[0] || {
          totalParcels: 0,
          pendingParcels: 0,
          inTransit: 0,
          delivered: 0,
        },

        totalSpent,

        recentParcels: result.recentParcels || [],
      },
    });
  } catch (error) {
    console.error("User dashboard error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load user dashboard",
    });
  }
});

router.get("/rider", verifyFBToken, async (req, res) => {
  try {
    const riderEmail = req.user.email;

    const parcelStats = await parcelCollection()
      .aggregate([
        {
          $match: {
            assignedRiderEmail: riderEmail,
          },
        },

        {
          $group: {
            _id: null,

            totalDeliveries: {
              $sum: 1,
            },

            assignedDeliveries: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$delivery_Status", "assign_rider"],
                  },
                  1,
                  0,
                ],
              },
            },

            inTransit: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$delivery_Status", "in-transit"],
                  },
                  1,
                  0,
                ],
              },
            },

            completed: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$delivery_Status",
                      ["delivered", "service_center_delivered"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const cashoutStats = await cashoutCollection()
      .aggregate([
        {
          $match: {
            riderEmail,
          },
        },

        {
          $group: {
            _id: null,

            pendingAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$cashoutStatus", "pending"],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            approvedAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$cashoutStatus", "approved"],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            paidAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$cashoutStatus", "paid"],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const recentDeliveries = await parcelCollection()
      .find({
        assignedRiderEmail: riderEmail,
      })
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .project({
        parcelName: 1,
        trackingId: 1,
        receiverName: 1,
        receiverDistrict: 1,
        receiverServiceCenter: 1,
        delivery_Status: 1,
        deliveryCost: 1,
        updatedAt: 1,
      })
      .toArray();

    const stats = parcelStats[0] || {};

    const earnings = cashoutStats[0] || {};

    res.status(200).send({
      success: true,

      data: {
        statistics: {
          totalDeliveries: stats.totalDeliveries || 0,
          assignedDeliveries: stats.assignedDeliveries || 0,
          inTransit: stats.inTransit || 0,
          completed: stats.completed || 0,
        },

        earnings: {
          pendingAmount: earnings.pendingAmount || 0,
          approvedAmount: earnings.approvedAmount || 0,
          paidAmount: earnings.paidAmount || 0,
          totalEarnings:
            (earnings.pendingAmount || 0) +
            (earnings.approvedAmount || 0) +
            (earnings.paidAmount || 0),
        },

        recentDeliveries,
      },
    });
  } catch (error) {
    console.error("Rider dashboard error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load rider dashboard",
    });
  }
});

router.get("/admin", verifyFBToken, async (req, res) => {
  try {
    // USERS
    const userStats = await usersCollection()
      .aggregate([
        {
          $group: {
            _id: "$role",
            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

    // RIDERS
    const riderStats = await riderCollection()
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

    // PARCELS
    const parcelStats = await parcelCollection()
      .aggregate([
        {
          $group: {
            _id: null,

            totalParcels: {
              $sum: 1,
            },

            pendingParcels: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$delivery_Status", "not_collected"],
                  },
                  1,
                  0,
                ],
              },
            },

            assignedParcels: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$delivery_Status", "assign_rider"],
                  },
                  1,
                  0,
                ],
              },
            },

            inTransit: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$delivery_Status", "in-transit"],
                  },
                  1,
                  0,
                ],
              },
            },

            delivered: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$delivery_Status",
                      ["delivered", "service_center_delivered"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            totalDeliveryCost: {
              $sum: "$deliveryCost",
            },
          },
        },
      ])
      .toArray();

    // PAYMENTS
    const paymentStats = await paymentCollection()
      .aggregate([
        {
          $match: {
            paymentStatus: "succeeded",
          },
        },

        {
          $group: {
            _id: null,

            totalRevenue: {
              $sum: "$amount",
            },

            successfulPayments: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

    // CASHOUTS
    const cashoutStats = await cashoutCollection()
      .aggregate([
        {
          $group: {
            _id: "$cashoutStatus",

            amount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

    // RECENT PARCELS
    const recentParcels = await parcelCollection()
      .find({})
      .sort({
        creation_date: -1,
      })
      .limit(5)
      .project({
        parcelName: 1,
        trackingId: 1,
        created_by: 1,
        deliveryCost: 1,
        paymentStatus: 1,
        delivery_Status: 1,
        creation_date: 1,
      })
      .toArray();

    // RECENT RIDERS
    const recentRiders = await riderCollection()
      .find({})
      .sort({
        appliedAt: -1,
      })
      .limit(5)
      .project({
        name: 1,
        email: 1,
        region: 1,
        district: 1,
        status: 1,
        appliedAt: 1,
      })
      .toArray();

    // Convert aggregation results
    const users = {
      total: userStats.reduce((total, item) => total + item.count, 0),

      admins: userStats.find((item) => item._id === "admin")?.count || 0,

      users: userStats.find((item) => item._id === "user")?.count || 0,

      riders: userStats.find((item) => item._id === "rider")?.count || 0,
    };

    const riders = {
      pending: riderStats.find((item) => item._id === "pending")?.count || 0,

      approved: riderStats.find((item) => item._id === "approved")?.count || 0,

      rejected: riderStats.find((item) => item._id === "rejected")?.count || 0,
    };

    const parcels = parcelStats[0] || {};

    const payments = paymentStats[0] || {};

    const cashouts = {
      pending: cashoutStats.find((item) => item._id === "pending")?.amount || 0,

      approved:
        cashoutStats.find((item) => item._id === "approved")?.amount || 0,

      paid: cashoutStats.find((item) => item._id === "paid")?.amount || 0,

      rejected:
        cashoutStats.find((item) => item._id === "rejected")?.amount || 0,
    };

    res.status(200).send({
      success: true,

      data: {
        users,
        riders,

        parcels: {
          total: parcels.totalParcels || 0,
          pending: parcels.pendingParcels || 0,
          assigned: parcels.assignedParcels || 0,
          inTransit: parcels.inTransit || 0,
          delivered: parcels.delivered || 0,
        },

        payments: {
          totalRevenue: payments.totalRevenue || 0,
          successfulPayments: payments.successfulPayments || 0,
        },

        cashouts,

        recentParcels,
        recentRiders,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load admin dashboard",
    });
  }
});

module.exports = router;
