require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const parcelRoutes = require("./routes/parcel.routes");
const paymentRoutes = require("./routes/payment.routes");
const trackingRoutes = require("./routes/tracking.routes");
const userRoutes = require("./routes/user.routes");
const userRiders = require("./routes/rider.routes");
const adminRoutes = require("./routes/admin.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("GoCarry server is running");
});

// Routes
app.use("/parcels", parcelRoutes);
app.use("/payments", paymentRoutes);
app.use("/tracking", trackingRoutes);
app.use("/users", userRoutes);
app.use("/riders", userRiders);
app.use("/admin", adminRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notifications", notificationRoutes);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
  }
};

startServer();
