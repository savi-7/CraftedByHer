const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function loadServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    throw err;
  }
}

function loadServiceAccountFromFile() {
  const p = path.join(__dirname, "config", "serviceAccountKey.json");
  if (!fs.existsSync(p)) return null;
  try {
    // Only for local/dev. Don't rely on this in Vercel.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(p);
  } catch (err) {
    console.error("❌ Failed to load Firebase service account file:", p);
    throw err;
  }
}

function initFirebase() {
  if (admin.apps.length) return { configured: true };

  const serviceAccount = loadServiceAccountFromEnv() || loadServiceAccountFromFile();

  if (!serviceAccount) {
    console.warn(
      "⚠️ Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in environment variables."
    );
    return { configured: false };
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return { configured: true };
}

const { configured } = initFirebase();
admin.__isConfigured = configured;

module.exports = admin;
