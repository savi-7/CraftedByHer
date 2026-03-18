const admin = require("../firebaseAdmin");

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    console.log(`🔒 verifyFirebaseToken called for: ${req.method} ${req.url}`);
    if (!admin.apps?.length || admin.__isConfigured === false) {
      return res.status(500).json({
        ok: false,
        message:
          "Firebase Admin is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel env vars.",
      });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ No token in request to ${req.url}`);
      return res.status(401).json({ ok: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    console.log("Decoded token:", decoded);

    req.user = decoded; // include uid, email, etc.
    next();
  } catch (err) {
    console.error("verifyFirebaseToken error:", err.message);
    res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
};
