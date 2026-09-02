const express = require("express");
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const verifyFBToken = require("../middleware/verifyFBToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

const userCollection = () => {
  return getDB().collection("users");
};

// Make User Admin
router.patch(
  "/users/make-admin/:id",
  verifyFBToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log(id);
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid user ID",
        });
      }

      const result = await userCollection().updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            role: "admin",
            updatedAt: new Date().toISOString(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).send({
        success: true,
        message: "User promoted to admin successfully",
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to make user admin",
        error: error.message,
      });
    }
  },
);

// Remove Admin Role
router.patch(
  "/users/remove-admin/:id",
  verifyFBToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          success: false,
          message: "Invalid user ID",
        });
      }

      const result = await userCollection().updateOne(
        {
          _id: new ObjectId(id),
          role: "admin",
        },
        {
          $set: {
            role: "user",
            updatedAt: new Date().toISOString(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          success: false,
          message: "Admin user not found",
        });
      }

      res.status(200).send({
        success: true,
        message: "Admin role removed successfully",
      });
    } catch (error) {
      console.error("Remove admin error:", error);

      res.status(500).send({
        success: false,
        message: "Failed to remove admin role",
        error: error.message,
      });
    }
  },
);

module.exports = router;
