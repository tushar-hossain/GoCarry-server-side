const express = require("express");
const Stripe = require("stripe");
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

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
    res.status(500).send({
      success: false,
      message: "Failed to create payment intent",
      error: error.message,
    });
  }
});

// save payment and status changes parcel
router.post("/save-payment", async (req, res) => {
  try {
    const {
      paymentIntentId,
      parcelId,
      status,
      currency = "usd",
      user,
    } = req.body;

    if (!paymentIntentId || !parcelId || !status) {
      return res.status(400).send({
        success: false,
        message: "paymentIntentId, parcelId and status are required",
      });
    }

    const db = getDB();
    const parcelCollection = db.collection("parcels");
    const paymentCollection = db.collection("payments");

    // Validate parcel ID
    if (!ObjectId.isValid(parcelId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid parcel ID",
      });
    }

    // Find parcel
    const parcel = await parcelCollection.findOne({
      _id: new ObjectId(parcelId),
    });

    if (!parcel) {
      return res.status(404).send({
        success: false,
        message: "Parcel not found",
      });
    }

    // Check duplicate payment
    const existingPayment = await paymentCollection.findOne({
      paymentIntentId,
    });

    if (existingPayment) {
      return res.status(409).send({
        success: false,
        message: "Payment already exists",
      });
    }

    // Generate tracking ID if parcel doesn't have one
    let trackingId = parcel.trackingId;

    if (!trackingId) {
      const randomCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      trackingId = `GC-${date}-${randomCode}`;
    }

    // Save payment
    const payment = {
      paymentIntentId,
      parcelId: parcel._id,
      amount: parcel.deliveryCost,
      currency,
      created_by: parcel.created_by,
      user,
      paymentStatus: status,
      payment_date: status === "succeeded" ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const paymentResult = await paymentCollection.insertOne(payment);

    // Update parcel
    const parcelUpdate = {
      paymentStatus: status,
      trackingId,
      updatedAt: new Date().toISOString(),
    };

    await parcelCollection.updateOne(
      {
        _id: new ObjectId(parcelId),
      },
      {
        $set: parcelUpdate,
      },
    );

    res.status(201).send({
      success: true,
      message: "Payment saved and parcel updated successfully",

      data: {
        paymentId: paymentResult.insertedId,
        parcelId: parcel._id,
        trackingId,
        paymentStatus: status,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to save payment",
      error: error.message,
    });
  }
});

// get user email or admin get all data
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;

    const query = email
      ? {
          created_by: email,
        }
      : {};

    const db = getDB();
    const parcelCollection = db.collection("parcels");
    const parcels = await parcelCollection
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      data: parcels,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to retrieve parcels",
      error: error.message,
    });
  }
});

module.exports = router;
