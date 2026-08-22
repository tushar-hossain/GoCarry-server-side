require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("../src/config/db");
const { dbCollection } = require("./config/dbCollection");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GoCarry server is running");
});

// get all parcel data
app.get("/parcels", async (req, res) => {
  try {
    const { email } = req.query;
    const db = getDB();
    const parcelCollection = db.collection("parcel");

    const query = email ? { created_by } : {};

    const parcels = await parcelCollection
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Parcels retrieved successfully",
      data: parcels,
    });
  } catch (error) {
    console.error("Get parcels error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve parcels",
      error: error.message,
    });
  }
});

// Post Parcel data
app.post("/parcels", async (req, res) => {
  try {
    const parcelData = req.body;
    // DB Collection
    const collection = dbCollection("parcels");
    const result = await collection.parcelCollection.insertOne(parcelData);
    res.status(201).send({
      success: true,
      message: "parcels created successfully",
      result: result,
    });
  } catch (error) {
    console.error("Create parcels error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create parcels",
      error: error.message,
    });
  }
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
