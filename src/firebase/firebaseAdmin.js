const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./firebaseServiceAccount.json");

initializeApp({
  credential: cert(serviceAccount),
});

const firebaseAuth = getAuth();

module.exports = firebaseAuth;
