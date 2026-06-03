import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import { resetSalesAnalytics } from "../src/services/analyticsService.js";

dotenv.config();

async function run() {
  await connectDB(process.env.MONGO_URI);
  const result = await resetSalesAnalytics();
  console.log(`Sales analytics reset. Fresh tracking starts at ${result.resetAt.toISOString()}.`);
}

run()
  .catch((error) => {
    console.error("Failed to reset sales analytics:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
