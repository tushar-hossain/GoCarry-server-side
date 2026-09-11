const { getDB } = require("../config/db");

const verifyRider = async (req, res, next) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      uid,
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Check user role
    if (user.role !== "rider") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. Rider access required.",
      });
    }

    // Find rider
    const rider = await db.collection("riders").findOne({
      uid,
    });

    if (!rider) {
      return res.status(404).send({
        success: false,
        message: "Rider profile not found",
      });
    }

    // Check rider approval
    if (rider.status !== "approved") {
      return res.status(403).send({
        success: false,
        message: "Your rider account is not approved yet.",
      });
    }

    req.dbUser = user;

    next();
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to verify rider",
    });
  }
};

module.exports = verifyRider;
