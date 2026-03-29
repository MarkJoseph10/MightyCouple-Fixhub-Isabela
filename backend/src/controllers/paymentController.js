import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Order } from "../models/Order.js";
import { createPaymentIntent } from "../services/paymentService.js";
import { isPaymentMethodEnabled } from "../utils/commerce.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";
import { autoCancelStalePendingOrders } from "../services/orderAutomationService.js";

export const initializePayment = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await Order.findById(req.body.orderId);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const isOwner = order.user && String(order.user) === String(req.user._id);

  if (req.user.role !== "admin" && !isOwner) {
    throw new ApiError(403, "You do not have permission to access this order");
  }

  if (order.status === "cancelled") {
    throw new ApiError(400, "This order has already been cancelled");
  }

  if (!isPaymentMethodEnabled(storeSettings.paymentOptions, order.payment.method)) {
    throw new ApiError(400, "This payment method is currently disabled");
  }

  if (order.payment.method !== "stripe") {
    res.json({
      provider: order.payment.method,
      message: order.payment.instructions || "Payment instructions available after checkout."
    });
    return;
  }

  const payment = await createPaymentIntent({
    amount: order.pricing.total,
    orderId: order._id.toString(),
    email: order.shippingAddress?.email || order.guestCustomer?.email || req.user?.email || ""
  });

  order.payment.clientSecret = payment.clientSecret;
  order.payment.status = payment.provider === "stripe" ? order.payment.status : "pending";
  await order.save();

  res.json(payment);
});
