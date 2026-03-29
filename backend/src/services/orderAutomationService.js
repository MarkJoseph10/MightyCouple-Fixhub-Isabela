import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

async function restoreInventoryForOrderItems(items) {
  for (const item of items) {
    const product = await Product.findById(item.product);

    if (!product) {
      continue;
    }

    product.stock = Number(product.stock || 0) + Number(item.quantity || 0);

    if (item.variantId) {
      const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));

      if (variant) {
        variant.stock = Number(variant.stock || 0) + Number(item.quantity || 0);
      }
    }

    if (!item.isFreeGift) {
      product.soldCount = Math.max(0, Number(product.soldCount || 0) - Number(item.quantity || 0));
    }

    await product.save();
  }
}

export async function autoCancelStalePendingOrders(settings) {
  const autoCancelHours = Number(settings.orderRules?.autoCancelUnpaidHours || 0);

  if (!autoCancelHours) {
    return 0;
  }

  const cutoff = new Date(Date.now() - autoCancelHours * 60 * 60 * 1000);
  const staleOrders = await Order.find({
    status: "pending",
    "payment.status": "pending",
    "payment.method": { $ne: "cod" },
    createdAt: { $lte: cutoff }
  });

  for (const order of staleOrders) {
    await restoreInventoryForOrderItems(order.items);
    order.status = "cancelled";
    order.payment.status = "failed";
    order.notes = [order.notes, `Auto-cancelled after ${autoCancelHours} hours without confirmed payment.`]
      .filter(Boolean)
      .join(" | ");
    order.timeline.push({
      label: `Auto-cancelled after ${autoCancelHours} hours without payment`,
      status: "cancelled",
      at: new Date()
    });
    await order.save();
  }

  return staleOrders.length;
}
