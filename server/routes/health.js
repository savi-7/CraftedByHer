const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const FormData = require("form-data");

// Your health risk server — set in .env (e.g. http://13.234.28.164 or http://localhost:8000)
const HEALTH_API_BASE = process.env.HEALTH_PREDICTOR_URL || "http://13.234.28.164";
const HEALTH_API_PATH = process.env.HEALTH_PREDICTOR_PATH || "/api/extract";
// Field name your server expects for the back image (e.g. back_image, image, file)
const HEALTH_BACK_FIELD = process.env.HEALTH_PREDICTOR_BACK_FIELD || "back_image";
const HEALTH_FRONT_FIELD = process.env.HEALTH_PREDICTOR_FRONT_FIELD || "front_image";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  // No fileFilter — accept any file so upload is never rejected
});

// Accept any file field name for back image; if only one file, use it as back
const BACK_FIELD_NAMES = ["backImage", "back_image", "image", "file"];
const FRONT_FIELD_NAMES = ["frontImage", "front_image"];

// Handler expects req.files (multer runs in main app first for POST /api/health/predict)
router.post("/predict", async (req, res) => {
  try {
    const list = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    let backFile = list.find((f) => BACK_FIELD_NAMES.includes(f.fieldname));
    let frontFile = list.find((f) => FRONT_FIELD_NAMES.includes(f.fieldname));
    if (!backFile && list.length >= 1) backFile = list[0];
    if (!frontFile && list.length >= 2) frontFile = list[1];

    if (!backFile) {
      const ct = req.headers["content-type"] || "";
      console.log("[health] No file received. Content-Type:", ct.substring(0, 50), "files count:", list.length);
      return res.status(400).json({
        error: "Back image (nutrition label) is required. Please upload an image of the product's back.",
      });
    }

    const form = new FormData();
    form.append(HEALTH_BACK_FIELD, backFile.buffer, {
      filename: backFile.originalname,
      contentType: backFile.mimetype,
    });
    if (frontFile) {
      form.append(HEALTH_FRONT_FIELD, frontFile.buffer, {
        filename: frontFile.originalname,
        contentType: frontFile.mimetype,
      });
    }
    form.append("include_health", "true");
    form.append("include_food_info", "true");

    const healthUrl = `${HEALTH_API_BASE.replace(/\/$/, "")}${HEALTH_API_PATH.startsWith("/") ? HEALTH_API_PATH : "/" + HEALTH_API_PATH}`;
    const headers = { ...form.getHeaders() };

    // Send as buffer with Content-Length so the external API can parse the body reliably
    const bodyBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      form.on("data", (chunk) => {
        if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
        else chunks.push(chunk);
      });
      form.on("end", () => resolve(Buffer.concat(chunks)));
      form.on("error", reject);
      form.resume();
    });
    headers["Content-Length"] = String(bodyBuffer.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let apiRes;
    try {
      apiRes = await fetch(healthUrl, {
        method: "POST",
        body: bodyBuffer,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok) {
      const message = data.detail || data.error || `API returned ${apiRes.status}`;
      return res.status(apiRes.status >= 400 ? apiRes.status : 502).json({ error: message });
    }

    // Normalize so frontend always gets status + food_info, health_info, nutrition_info
    const payload = { ...data };
    if (!payload.status && !payload.error) payload.status = "success";

    res.json(payload);
  } catch (err) {
    console.error("Health extract error:", err);
    res.status(500).json({
      error: err.message || "Failed to call extraction service.",
    });
  }
});

router.use((err, req, res, next) => {
  if (!err) return next();
  const msg = err.code === "LIMIT_FILE_SIZE"
    ? "File too large. Maximum size is 10MB."
    : (err.message || "Invalid file upload.");
  return res.status(400).json({ error: msg });
});

// Export for main app: run uploadAny first for POST /api/health/predict so body is parsed before any other middleware
router.uploadAny = upload.any();
module.exports = router;
