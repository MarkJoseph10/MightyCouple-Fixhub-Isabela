import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";
import { autoCancelStalePendingOrders } from "../services/orderAutomationService.js";
import {
  calculateCartDiscounts,
  formatVariantLabel,
  isPaymentMethodEnabled,
  resolveLocationShippingFee
} from "../utils/commerce.js";
import { isValidEmail, isValidPhone, normalizePhilippinePhone } from "../utils/validators.js";

function createTimeline(status, label) {
  const labelMap = {
    pending: "Order placed",
    paid: "Payment confirmed",
    verified: "Order verified",
    packed: "Order packed",
    processing: "Order processing",
    shipped: "Order shipped",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  return {
    label: label || labelMap[status] || "Status updated",
    status,
    at: new Date()
  };
}

function requiresProof(settings, method) {
  const proofSettings = settings.paymentDetails?.proofOfPaymentRequired || {};

  if (method === "bank_transfer") {
    return proofSettings.bankTransfer !== false;
  }

  return proofSettings[method] === true;
}

function getPaymentInstructions(method, settings) {
  const autoCancelHours = Number(settings.orderRules?.autoCancelUnpaidHours || 24);
  const gcash = settings.paymentDetails?.gcash || {};
  const bankTransfer = settings.paymentDetails?.bankTransfer || {};

  if (method === "gcash") {
    return `Send payment to GCash: ${gcash.accountName || "GCash account"} (${gcash.number || "number not set"}). Proof of payment is required within ${autoCancelHours} hours.`;
  }

  if (method === "bank_transfer") {
    return `Send payment to ${bankTransfer.bankName || "bank transfer"} | ${bankTransfer.accountName || "account name not set"} | ${bankTransfer.accountNumber || "account number not set"}. Proof of payment is required within ${autoCancelHours} hours.`;
  }

  if (method === "cod") {
    return "Cash on Delivery is enabled for this order. Payment is collected upon delivery, so no proof of payment is required.";
  }

  const instructionMap = {
    stripe: "Secure Stripe sandbox checkout initialized. Complete payment to confirm the order.",
    paypal: `PayPal sandbox checkout selected. Confirm payment within ${autoCancelHours} hours to avoid automatic cancellation.`,
    maya: `Complete your Maya payment and wait for manual confirmation within ${autoCancelHours} hours.`
  };

  return instructionMap[method] || "Payment instructions available after checkout.";
}

function validateShippingAddress(address) {
  if (!address.fullName?.trim()) {
    throw new ApiError(400, "Full name is required");
  }

  if (!isValidEmail(address.email)) {
    throw new ApiError(400, "Please enter a valid email address");
  }

  if (!isValidPhone(address.phone)) {
    throw new ApiError(400, "Please enter a valid Philippine mobile number");
  }

  if (!address.line1?.trim() || !address.city?.trim() || !address.province?.trim()) {
    throw new ApiError(400, "Please complete the shipping address");
  }
}

function normalizeShippingAddress(address = {}, user) {
  return {
    fullName: String(address.fullName || user?.name || "").trim(),
    email: String(address.email || user?.email || "").trim().toLowerCase(),
    phone: normalizePhilippinePhone(address.phone),
    line1: String(address.line1 || "").trim(),
    city: String(address.city || "").trim(),
    province: String(address.province || "").trim(),
    postalCode: String(address.postalCode || "").trim(),
    country: String(address.country || "Philippines").trim()
  };
}

function getAccessEmail(req) {
  return String(req.query.email || req.body?.email || "").trim().toLowerCase();
}

function canAccessOrder(order, req) {
  if (req.user?.role === "admin") {
    return true;
  }

  if (req.user && order.user) {
    return String(order.user._id || order.user) === String(req.user._id);
  }

  const queryEmail = getAccessEmail(req);
  const guestEmail = String(order.guestCustomer?.email || order.shippingAddress?.email || "").trim().toLowerCase();

  return Boolean(queryEmail && guestEmail && queryEmail === guestEmail);
}

async function buildNormalizedItems(items, products) {
  return items.map((item) => {
    const product = products.find((entry) => entry._id.toString() === item.productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    const quantity = Number(item.quantity || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, `Invalid quantity for ${product.name}`);
    }

    const selectedVariant = item.variantId
      ? product.variants?.find((variant) => String(variant._id) === String(item.variantId))
      : product.variants?.find((variant) => variant.isDefault) || product.variants?.[0];

    const availableStock = selectedVariant ? Number(selectedVariant.stock || 0) : Number(product.stock || 0);

    if (availableStock < quantity) {
      throw new ApiError(400, `Only ${availableStock} item(s) left for ${product.name}`);
    }

    return {
      productDoc: product,
      product: product._id,
      name: product.name,
      image: product.images?.[0]?.url || "",
      price: Number(selectedVariant?.price || product.price || 0),
      costPrice: Number(product.costPrice || 0),
      quantity,
      variantId: selectedVariant?._id ? String(selectedVariant._id) : "",
      variantLabel: selectedVariant ? formatVariantLabel(selectedVariant) : "",
      isFreeGift: false,
      bundleEligible: product.bundleEligible !== false
    };
  });
}

async function maybeAddFreeGift(items, settings) {
  const freeGift = settings.promotions?.freeGift;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!freeGift?.enabled || !freeGift.giftProductId || totalQuantity < Number(freeGift.buyQuantity || 2)) {
    return items;
  }

  const existingGift = items.find((item) => String(item.product) === String(freeGift.giftProductId));

  if (existingGift) {
    return items;
  }

  const giftProduct = await Product.findById(freeGift.giftProductId);

  if (!giftProduct || Number(giftProduct.stock || 0) < 1) {
    return items;
  }

  return [
    ...items,
    {
      productDoc: giftProduct,
      product: giftProduct._id,
      name: `${giftProduct.name} (Free gift)`,
      image: giftProduct.images?.[0]?.url || "",
      price: 0,
      costPrice: Number(giftProduct.costPrice || 0),
      quantity: 1,
      variantId: "",
      variantLabel: "",
      isFreeGift: true,
      bundleEligible: false
    }
  ];
}

async function updateInventoryForOrderItems(items) {
  for (const item of items) {
    const product = await Product.findById(item.product);

    if (!product) {
      continue;
    }

    product.stock = Math.max(0, Number(product.stock || 0) - item.quantity);

    if (item.variantId) {
      const variant = product.variants.find((entry) => String(entry._id) === String(item.variantId));

      if (variant) {
        variant.stock = Math.max(0, Number(variant.stock || 0) - item.quantity);
      }
    }

    if (!item.isFreeGift) {
      product.soldCount = Number(product.soldCount || 0) + item.quantity;
    }

    await product.save();
  }
}

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

export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress = {}, paymentMethod = "stripe", promoCode = "" } = req.body;

  if (!req.user) {
    throw new ApiError(401, "Please log in to place an order");
  }

  if (!items?.length) {
    throw new ApiError(400, "At least one order item is required");
  }

  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);

  if (!isPaymentMethodEnabled(storeSettings.paymentOptions, paymentMethod)) {
    throw new ApiError(400, "Selected payment method is not available");
  }

  const normalizedAddress = normalizeShippingAddress(shippingAddress, req.user);
  validateShippingAddress(normalizedAddress);

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  let normalizedItems = await buildNormalizedItems(items, products);
  normalizedItems = await maybeAddFreeGift(normalizedItems, storeSettings);

  const discountSummary = calculateCartDiscounts({
    items: normalizedItems.map((item) => ({
      price: item.price,
      quantity: item.quantity,
      bundleEligible: item.bundleEligible
    })),
    settings: storeSettings,
    promoCode
  });

  const shippingSummary = normalizedItems.length
    ? resolveLocationShippingFee(storeSettings.shipping, normalizedAddress)
    : { fee: 0, matchedLocation: "Nationwide" };
  const shipping = Number(shippingSummary.fee || 0);
  const taxableAmount = Math.max(0, discountSummary.subtotal - discountSummary.discount);
  const tax = Number((taxableAmount * 0.02).toFixed(2));
  const total = Number((taxableAmount + shipping + tax).toFixed(2));

  const order = await Order.create({
    user: req.user._id,
    guestCustomer: undefined,
    items: normalizedItems.map(({ productDoc, bundleEligible, ...item }) => item),
    shippingAddress: normalizedAddress,
    pricing: {
      subtotal: discountSummary.subtotal,
      shipping,
      tax,
      discount: discountSummary.discount,
      total
    },
    payment: {
      method: paymentMethod,
      status: "pending",
      instructions: getPaymentInstructions(paymentMethod, storeSettings)
    },
    promoCode: discountSummary.matchedPromoCode,
    status: "pending",
    notes: [
      shippingSummary.matchedLocation ? `Shipping zone: ${shippingSummary.matchedLocation}` : "",
      paymentMethod === "cod" ? "COD order received. Wait for order verification before packing." : "",
      requiresProof(storeSettings, paymentMethod) ? "Proof of payment required before fulfillment." : "",
      ...discountSummary.appliedLabels
    ]
      .filter(Boolean)
      .join(" | "),
    timeline: [createTimeline("pending")]
  });

  await updateInventoryForOrderItems(order.items);

  res.status(201).json({
    ...order.toObject(),
    paymentMessage: getPaymentInstructions(paymentMethod, storeSettings)
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export const trackOrder = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!canAccessOrder(order, req)) {
    throw new ApiError(403, "You cannot view this order");
  }

  res.json(order);
});

export const getAllOrders = asyncHandler(async (_, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const orders = await Order.find().sort({ createdAt: -1 }).populate("user", "name email");
  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!canAccessOrder(order, req)) {
    throw new ApiError(403, "You cannot view this order");
  }

  res.json(order);
});

export const uploadPaymentProof = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!canAccessOrder(order, req)) {
    throw new ApiError(403, "You cannot update this order");
  }

  if (!req.file) {
    throw new ApiError(400, "Payment proof image is required");
  }

  if (!["gcash", "bank_transfer"].includes(order.payment.method)) {
    throw new ApiError(400, "This payment method does not accept proof uploads");
  }

  if (order.status === "cancelled") {
    throw new ApiError(400, "This order is already cancelled");
  }

  if (order.payment.status === "paid") {
    throw new ApiError(400, "Payment is already confirmed for this order");
  }

  order.payment.proofImage = `/uploads/${req.file.filename}`;
  order.payment.proofUploadedAt = new Date();
  order.timeline.push(createTimeline("pending", "Payment proof submitted for review"));
  order.notes = [order.notes, "Payment proof uploaded by customer."]
    .filter(Boolean)
    .join(" | ");
  await order.save();

  res.json({
    message: "Payment proof uploaded successfully",
    order
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const previousStatus = order.status;

  if (status && status !== order.status) {
    order.status = status;
    order.timeline.push(createTimeline(status));
  }

  if (paymentStatus && paymentStatus !== order.payment.status) {
    order.payment.status = paymentStatus;

    if (paymentStatus === "paid") {
      order.timeline.push(createTimeline("paid"));

      if (order.status === "pending") {
        order.status = "verified";
        order.timeline.push(createTimeline("verified"));
      }
    }
  }

  if (status === "cancelled" && previousStatus !== "cancelled") {
    await restoreInventoryForOrderItems(order.items);
  }

  await order.save();
  res.json(order);
});
