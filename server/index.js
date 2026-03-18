const app = require("./app");
const { connectDb } = require("./db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDb();
  console.log("✅ MongoDB connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);

    const emailConfigured =
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_USER !== "your-email@gmail.com" &&
      process.env.EMAIL_PASS !== "your-app-password-here";

    if (emailConfigured) {
      console.log("📧 Email service: CONFIGURED ✅");
    } else {
      console.log("⚠️  Email service: NOT CONFIGURED");
      console.log("📝 Seller approval emails will NOT work until configured");
      console.log("📖 See QUICK_EMAIL_FIX.md or EMAIL_SETUP_COMPLETE_GUIDE.md");
    }
  });
}

// Only start a dev server when running directly (local/dev).
if (require.main === module) {
  start().catch((err) => console.error("❌ Server start error:", err));
}

module.exports = app;