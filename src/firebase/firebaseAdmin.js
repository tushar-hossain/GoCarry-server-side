require("dotenv").config();
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8"),
);

initializeApp({
  credential: cert(serviceAccount),
});

const firebaseAuth = getAuth();

module.exports = firebaseAuth;
