import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";

export const trackCartAdd = asyncHandler(async (_, res) => {
  const settings = await getOrCreateStoreSettings();
  settings.metrics.cartAdds += 1;
  await settings.save();

  res.status(201).json({ message: "Cart event tracked" });
});

