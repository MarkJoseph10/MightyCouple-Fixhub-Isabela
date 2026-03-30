import { Product } from "../models/Product.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { sampleProducts } from "../data/sampleProducts.js";
import { sampleUsers } from "../data/sampleUsers.js";
import { getOrCreateStoreSettings } from "./storeSettingsService.js";

function getSeedUsers() {
  if (env.adminEmail && env.adminPassword) {
    return [
      {
        name: env.adminName || "Store Admin",
        email: env.adminEmail,
        password: env.adminPassword,
        role: "admin"
      }
    ];
  }

  if (env.nodeEnv === "production") {
    console.warn(
      "Skipping default admin seed in production. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin user."
    );
    return [];
  }

  return sampleUsers;
}

export async function ensureSeedData() {
  const [userCount, productCount] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments()
  ]);
  const usersToSeed = getSeedUsers();

  if (!userCount) {
    for (const user of usersToSeed) {
      await User.create(user);
    }
  }

  if (!productCount) {
    await Product.insertMany(sampleProducts);
  }

  await getOrCreateStoreSettings();
}
