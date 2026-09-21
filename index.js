require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/db");
const parcelRoutes = require("./src/routes/parcel.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const trackingRoutes = require("./src/routes/tracking.routes");
const userRoutes = require("./src/routes/user.routes");
const userRiders = require("./src/routes/rider.routes");
const adminRoutes = require("./src/routes/admin.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const notificationRoutes = require("./src/routes/notification.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/parcels", parcelRoutes);
app.use("/payments", paymentRoutes);
app.use("/tracking", trackingRoutes);
app.use("/users", userRoutes);
app.use("/riders", userRiders);
app.use("/admin", adminRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("GoCarry server is running");
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

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
