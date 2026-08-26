const express = require("express");
const Stripe = require("stripe");
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).send({
        success: false,
        message: "Valid amount is required",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).send({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Create payment intent error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create payment intent",
      error: error.message,
    });
  }
});

// Save Payment
router.post("/save-payment", async (req, res) => {
  try {
    const { paymentIntentId, parcelId, amount, currency, created_by, status } =
      req.body;

    if (!paymentIntentId || !parcelId || !amount || !created_by || !status) {
      return res.status(400).send({
        success: false,
        message: "Required payment information is missing",
      });
    }

    const db = getDB();
    const paymentCollection = db.collection("payments");

    // Check if payment already exists
    const existingPayment = await paymentCollection.findOne({
      paymentIntentId,
    });

    if (existingPayment) {
      return res.status(409).send({
        success: false,
        message: "Payment already exists",
      });
    }

    const payment = {
      paymentIntentId,
      parcelId,
      amount,
      currency: currency || "usd",
      created_by,
      paymentStatus: status,
      payment_date: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await paymentCollection.insertOne(payment);

    res.status(201).send({
      success: true,
      message: "Payment information saved successfully",
      data: {
        insertedId: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Save payment error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to save payment",
      error: error.message,
    });
  }
});

// Update Payment Status
router.patch("/update-payment/:paymentIntentId", async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { paymentStatus } = req.body;

    const allowedStatuses = [
      "pending",
      "processing",
      "succeeded",
      "failed",
      "canceled",
    ];

    if (!allowedStatuses?.includes(paymentStatus)) {
      return res.status(400).send({
        success: false,
        message: "Invalid payment status",
      });
    }

    const db = getDB();
    const paymentCollection = db.collection("payments");

    const updateData = {
      paymentStatus,
      updatedAt: new Date(),
    };

    // Store payment date when payment succeeds
    if (paymentStatus === "succeeded") {
      updateData.payment_date = new Date();
    }

    const result = await paymentCollection.updateOne(
      { paymentIntentId },
      {
        $set: updateData,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Update payment error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
});

// User Payment History
router.get("/history", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const db = getDB();
    const paymentCollection = db.collection("payments");

    const payments = await paymentCollection
      .find({
        created_by: email,
      })
      .sort({
        _id: -1,
      })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Payment history retrieved successfully",
      data: payments,
    });
  } catch (error) {
    console.error("Get payment history error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve payment history",
      error: error.message,
    });
  }
});

// Admin - All Payment History
router.get("/admin/history", async (req, res) => {
  try {
    const db = getDB();
    const paymentCollection = db.collection("payments");

    const payments = await paymentCollection
      .find({})
      .sort({
        _id: -1,
      })
      .toArray();

    res.status(200).send({
      success: true,
      message: "All payment history retrieved successfully",
      data: payments,
    });
  } catch (error) {
    console.error("Get admin payment history error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve payment history",
      error: error.message,
    });
  }
});

// Get Single Payment
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const db = getDB();
    const paymentCollection = db.collection("payments");

    const payment = await paymentCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!payment) {
      return res.status(404).send({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).send({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve payment",
      error: error.message,
    });
  }
});

module.exports = router;
