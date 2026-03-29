import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { sampleProducts } from "../data/sampleProducts.js";
import { sampleUsers } from "../data/sampleUsers.js";
import { getOrCreateStoreSettings } from "./storeSettingsService.js";

export async function ensureSeedData() {
  const [userCount, productCount] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments()
  ]);

  if (!userCount) {
    for (const user of sampleUsers) {
      await User.create(user);
    }
  }

  if (!productCount) {
    await Product.insertMany(sampleProducts);
  }

  await getOrCreateStoreSettings();
}
