const mongoose = require("mongoose");

let cached = global.__MONGOOSE_CONN__;
if (!cached) {
  cached = global.__MONGOOSE_CONN__ = { conn: null, promise: null };
}

async function connectDb() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/foodily-auth-app";

    mongoose.set("debug", true);

    // Clear model cache to avoid conflicts in serverless reloads
    mongoose.models = {};
    mongoose.modelSchemas = {};

    mongoose.connection.on("connected", () => console.log("Mongoose connected"));
    mongoose.connection.on("error", (err) => console.error("Mongoose error:", err));
    mongoose.connection.on("disconnected", () => console.log("Mongoose disconnected"));

    cached.promise = mongoose.connect(uri).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectDb };

