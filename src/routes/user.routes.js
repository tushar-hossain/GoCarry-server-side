const express = require("express");
const { getDB } = require("../config/db");

const router = express.Router();

const userCollection = () => {
  return getDB().collection("users");
};

// Create or update user
router.post("/", async (req, res) => {
  try {
    const { uid, email, name } = req.body;

    if (!uid || !email) {
      return res.status(400).send({
        success: false,
        message: "UID and email are required",
      });
    }

    const collection = getDB().collection("users");
    const now = new Date().toISOString();
    const existingUser = await collection.findOne({ uid });

    // Existing user
    if (existingUser) {
      await collection.updateOne(
        { uid },
        {
          $set: {
            last_Login: now,
            updatedAt: now,
          },
        },
      );

      const updatedUser = await collection.findOne({ uid });
      return res.status(200).send({
        success: true,
        message: "User login updated successfully",
        isNewUser: false,
        data: updatedUser,
      });
    }

    // New user
    const newUser = {
      uid,
      email,
      name: name || "",
      role: "user",
      createdAt: now,
      last_Login: now,
    };

    const result = await collection.insertOne(newUser);

    res.status(201).send({
      success: true,
      message: "New user created successfully",
      isNewUser: true,
      data: {
        _id: result.insertedId,
        ...newUser,
      },
    });
  } catch (error) {
    console.error("User login error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to process user",
      error: error.message,
    });
  }
});

module.exports = router;
