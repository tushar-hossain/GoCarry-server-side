const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { getDB } = require("../config/db");
const { sendOtpEmail } = require("../utils/sendEmail");
const { getAuth } = require("firebase-admin/auth");

const usersCollection = () => {
  return getDB().collection("users");
};
const passwordResetOtpsCollection = () => {
  return getDB().collection("passwordResetOtps");
};

// Generate 6 digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash OTP/token before storing
const hashValue = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await usersCollection().findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "No account found with this email.",
      });
    }

    // Generate OTP
    const otp = generateOtp();

    // Hash OTP before storing
    const otpHash = hashValue(otp);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    // Remove previous OTP for this email
    await passwordResetOtpsCollection().deleteMany({
      email: normalizedEmail,
    });

    // Store new OTP
    await passwordResetOtpsCollection().insertOne({
      email: normalizedEmail,
      uid: user.uid,
      otpHash,
      expiresAt,
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    });

    // Send email
    await sendOtpEmail(normalizedEmail, otp);

    return res.send({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).send({
      success: false,
      message: "Failed to send OTP.",
    });
  }
});

// POST /auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).send({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetData = await passwordResetOtpsCollection().findOne({
      email: normalizedEmail,
    });

    if (!resetData) {
      return res.status(400).send({
        success: false,
        message: "OTP not found. Please request a new OTP.",
      });
    }

    // Check expiration
    if (new Date() > resetData.expiresAt) {
      await passwordResetOtpsCollection().deleteOne({
        _id: resetData._id,
      });

      return res.status(400).send({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Limit attempts
    if (resetData.attempts >= 5) {
      await passwordResetOtpsCollection().deleteOne({
        _id: resetData._id,
      });

      return res.status(429).send({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const otpHash = hashValue(otp);

    if (otpHash !== resetData.otpHash) {
      await passwordResetOtpsCollection().updateOne(
        { _id: resetData._id },
        {
          $inc: {
            attempts: 1,
          },
        },
      );

      return res.status(400).send({
        success: false,
        message: "Invalid OTP.",
      });
    }

    // OTP is valid
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashValue(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await passwordResetOtpsCollection().updateOne(
      {
        _id: resetData._id,
      },
      {
        $set: {
          verified: true,
          resetTokenHash,
          resetTokenExpiresAt,
        },
      },
    );

    return res.send({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).send({
      success: false,
      message: "Failed to verify OTP.",
    });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetToken, password } = req.body;

    if (!email || !resetToken || !password) {
      return res.status(400).send({
        success: false,
        message: "Email, reset token and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetData = await passwordResetOtpsCollection().findOne({
      email: normalizedEmail,
      verified: true,
    });

    if (!resetData) {
      return res.status(400).send({
        success: false,
        message: "Password reset session is invalid.",
      });
    }

    // Check reset token expiration
    if (
      !resetData.resetTokenExpiresAt ||
      new Date() > resetData.resetTokenExpiresAt
    ) {
      await passwordResetOtpsCollection().deleteOne({
        _id: resetData._id,
      });

      return res.status(400).send({
        success: false,
        message: "Password reset session has expired.",
      });
    }

    const resetTokenHash = hashValue(resetToken);

    if (resetTokenHash !== resetData.resetTokenHash) {
      return res.status(400).send({
        success: false,
        message: "Invalid reset token.",
      });
    }

    // Update Firebase password
    const auth = getAuth();

    await auth.updateUser(resetData.uid, {
      password,
    });

    // Delete used reset session
    await passwordResetOtpsCollection().deleteOne({
      _id: resetData._id,
    });

    return res.send({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).send({
      success: false,
      message: "Failed to reset password.",
    });
  }
});

module.exports = router;
