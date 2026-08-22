require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("GoCarry server is running");
});

// database
async function run() {
  try {
    // await client.connect();

    // db collections
    const parcelCollection = client
      .db(process.env.DB_NAME)
      .collection("parcels");

    // get all parcel data
    app.get("/parcels", async (req, res) => {
      try {
        const { email } = req.query;

        const query = email
          ? {
              created_by: email,
            }
          : {};

        const parcels = await parcelCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();

        res.status(200).send(parcels);
      } catch (error) {
        console.error("Get parcels error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to retrieve parcels",
          error: error.message,
        });
      }
    });

    // POST parcel
    app.post("/parcels", async (req, res) => {
      try {
        const parcelData = req.body;
        const result = await parcelCollection.insertOne(parcelData);

        res.status(201).send({
          success: true,
          message: "Parcel created successfully",
          result: result,
        });
      } catch (error) {
        console.error("Create parcel error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to create parcel",
          error: error.message,
        });
      }
    });

    // Delete parcel
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await parcelCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Parcel not found",
          });
        }

        res.status(200).send({
          success: true,
          message: "Parcel deleted successfully",
        });
      } catch (error) {
        console.error("Delete parcel error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to delete parcel",
          error: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server at running localhost:${PORT}`);
});
