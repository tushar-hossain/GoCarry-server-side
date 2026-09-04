const firebaseAuth = require("../firebase/firebaseAdmin");

const verifyFBToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({
        success: false,
        message: "Authorization header missing",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = authHeader?.split(" ")[1];
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    req.user = decodedToken;

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized access",
    });
  }
};

module.exports = verifyFBToken;
