import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Product } from "../models/Product.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { User } from "../models/User.js";
import { sampleProducts } from "./sampleProducts.js";
import { sampleUsers } from "./sampleUsers.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";

async function runSeed() {
  await connectDB(env.mongoUri);

  await Promise.all([Product.deleteMany(), User.deleteMany(), StoreSettings.deleteMany()]);

  for (const user of sampleUsers) {
    await User.create(user);
  }

  await Product.insertMany(sampleProducts);
  await getOrCreateStoreSettings();

  console.log("Seed completed");
  process.exit(0);
}

runSeed();
