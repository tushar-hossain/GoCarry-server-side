const { getDB } = require("../config/db");

const verifyAdmin = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const user = await getDB().collection("users").findOne({ uid });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Forbidden. Admin access required.",
      });
    }

    req.dbUser = user;

    next();
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to verify admin",
    });
  }
};

module.exports = verifyAdmin;
