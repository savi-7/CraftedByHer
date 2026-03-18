const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Loads .env locally; on Vercel, env vars come from project settings
dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5175",
];

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : defaultAllowedOrigins;

app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser requests (curl/postman) with no Origin header
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // convenient default for preview deployments
      if (origin.endsWith(".vercel.app")) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health predict: multer runs for this path before any body parser
const healthRouter = require("./routes/health");
app.use("/api/health/predict", (req, res, next) => {
  if (req.method !== "POST") return next();
  healthRouter.uploadAny(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Invalid file upload." });
    next();
  });
});
app.use("/api/health", healthRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory (note: Vercel filesystem is ephemeral)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Health check ---
app.get("/", (_, res) => res.send("CraftedByHer API is running 🎉"));

// --- Routes ---
const sellerManagement = require("./routes/sellerManagement");
const adminProducts = require("./routes/adminProducts");

app.use("/api/auth", require("./routes/auth"));
app.use("/api/seller/auth", require("./routes/sellerAuth"));
app.use("/api/seller/products", require("./routes/sellerProducts"));
app.use("/api/seller/orders", require("./routes/sellerOrders"));
app.use("/api/seller/management", sellerManagement);
app.use("/api/seller/applications", require("./routes/sellerApplications"));
app.use("/api/items", require("./routes/products"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/delivery", require("./routes/deliveryAgents"));
app.use("/api/delivery-agents", require("./routes/deliveryAgents"));
app.use("/api/delivery-orders", require("./routes/deliveryOrders"));
app.use("/api/admin/products", adminProducts);
app.use("/api/admin/orders", require("./routes/adminOrders"));
app.use("/api/admin/users", require("./routes/userManagement"));
app.use("/api/hub-managers", require("./routes/hubManagers"));
app.use("/api/hub-manager-auth", require("./routes/hubManagerAuth"));
app.use("/api/hub-notifications", require("./routes/hubNotifications"));
app.use("/api/delivery-otp", require("./routes/deliveryOTP"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/recommend", require("./routes/recommendations"));
app.use("/api/tracking", require("./routes/tracking"));
app.use("/api/sales-prediction", require("./routes/salesPredictionSimple"));
app.use("/api/hubs", require("./routes/hubs"));
app.use("/api/delivery-check", require("./routes/deliveryCheck"));
app.use("/api/content", require("./routes/content"));
app.use("/api/cakes", require("./routes/cakePreorder"));
app.use("/api/profile", require("./routes/userProfile"));

module.exports = app;

