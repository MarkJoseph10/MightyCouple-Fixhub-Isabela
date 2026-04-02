import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";
import { autoCancelStalePendingOrders } from "../services/orderAutomationService.js";
import { createNotifications } from "../services/notificationService.js";
import { uploadBufferToCloudinary } from "./uploadController.js";
import {
  calculateCartDiscounts,
  formatVariantLabel,
  isPaymentMethodEnabled,
  resolveLocationShippingFee
} from "../utils/commerce.js";
import { isValidEmail, isValidPhone, normalizePhilippinePhone } from "../utils/validators.js";

const refundReasonLabels = {
  defective_item: "Defective item",
  wrong_item: "Wrong item received",
  not_as_described: "Item not as described",
  damaged_in_transit: "Damaged in transit",
  changed_mind: "Changed mind",
  other: "Other refund reason"
};

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
    cancelled: "Cancelled",
    refund_pending: "Refund request submitted",
    refund_approved: "Refund approved",
    refund_rejected: "Refund rejected",
    refunded: "Refund completed"
  };

  return {
    label: label || labelMap[status] || "Status updated",
    status,
    at: new Date()
  };
}

function normalizeOrderReference(reference = "") {
  return String(reference || "").trim().toUpperCase();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCustomerTrackingStatus(order) {
  const orderStatus = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment?.status || "").toLowerCase();

  if (orderStatus === "cancelled") {
    return "cancelled";
  }

  if (orderStatus === "delivered") {
    return "delivered";
  }

  if (["shipped", "out_for_delivery"].includes(orderStatus)) {
    return "shipped";
  }

  if (paymentStatus === "paid" || ["paid", "verified", "packed", "processing"].includes(orderStatus)) {
    return "paid";
  }

  return "pending";
}

function getRefundPolicy(settings) {
  const eligibleStatuses = (settings.orderRules?.refundEligibleStatuses || ["delivered", "paid"])
    .map((status) => String(status || "").trim().toLowerCase())
    .filter((status) => ["delivered", "paid"].includes(status));

  return {
    eligibleStatuses: eligibleStatuses.length ? eligibleStatuses : ["delivered", "paid"],
    refundWindowDays: Math.max(0, Number(settings.orderRules?.refundWindowDays ?? 7))
  };
}

function getInstallmentConfig(settings) {
  const paymentCount = Math.max(1, Number(settings.installment?.paymentCount || 8));
  const downPaymentPercent = Math.max(0, Number(settings.installment?.downPaymentPercent || 0));
  const serviceFeePercent = Math.max(0, Number(settings.installment?.serviceFeePercent || 0));
  const configured = settings.installment?.enabled === true;

  return {
    enabled: configured,
    configured,
    frequency: settings.installment?.frequency === "monthly" ? "monthly" : "weekly",
    paymentCount,
    downPaymentPercent,
    serviceFeePercent,
    gracePeriodDays: Math.max(0, Number(settings.installment?.gracePeriodDays || 0)),
    releaseCondition: settings.installment?.releaseCondition === "admin_approved_early_release"
      ? "admin_approved_early_release"
      : "after_full_payment"
  };
}

function isInstallmentPlanValid(plan) {
  return Boolean(
    plan?.configured &&
      plan?.paymentCount > 0 &&
      Number(plan?.installmentAmount || 0) > 0 &&
      Number(plan?.totalWithServiceFee || 0) > 0
  );
}

function addInstallmentDate(date, frequency, step = 1) {
  const nextDate = new Date(date);

  if (frequency === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + step);
    return nextDate;
  }

  nextDate.setDate(nextDate.getDate() + (7 * step));
  return nextDate;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function uploadProofImage(file) {
  if (!file) {
    return "";
  }

  const result = await uploadBufferToCloudinary(file, "image");
  return result?.secure_url || "";
}

function buildInstallmentPlan(total, settings) {
  const config = getInstallmentConfig(settings);
  const totalAmount = roundMoney(total);
  const serviceFeeAmount = roundMoney(totalAmount * (config.serviceFeePercent / 100));
  const totalWithServiceFee = roundMoney(totalAmount + serviceFeeAmount);
  const downPaymentAmount = roundMoney(totalWithServiceFee * (config.downPaymentPercent / 100));
  const financedAmount = roundMoney(Math.max(0, totalWithServiceFee - downPaymentAmount));
  const baseInstallmentAmount = config.paymentCount > 0 ? roundMoney(financedAmount / config.paymentCount) : 0;
  const schedule = [];
  let scheduledTotal = 0;

  for (let index = 0; index < config.paymentCount; index += 1) {
    const amount = index === config.paymentCount - 1
      ? roundMoney(financedAmount - scheduledTotal)
      : baseInstallmentAmount;
    const dueDate = addInstallmentDate(new Date(), config.frequency, index + 1);
    schedule.push({
      sequence: index + 1,
      dueDate,
      amount,
      status: "scheduled"
    });
    scheduledTotal = roundMoney(scheduledTotal + amount);
  }

  return {
    ...config,
    valid: isInstallmentPlanValid({
      ...config,
      downPaymentAmount,
      installmentAmount: baseInstallmentAmount,
      totalWithServiceFee
    }),
    downPaymentAmount,
    serviceFeeAmount,
    financedAmount,
    installmentAmount: baseInstallmentAmount,
    totalWithServiceFee,
    amountPaid: 0,
    remainingBalance: totalWithServiceFee,
    nextDueDate: schedule[0]?.dueDate || null,
    agreementAccepted: false,
    noRefundAcknowledged: true,
    status: "pending_verification",
    schedule,
    payments: []
  };
}

function getInstallmentStatusLabel(status) {
  const labels = {
    active: "Installment active",
    pending_verification: "Installment payment pending verification",
    late: "Installment payment overdue",
    completed: "Installment fully paid",
    cancelled: "Installment forfeited"
  };

  return labels[status] || "Installment updated";
}

function deriveInstallmentStatus(installment) {
  if (!installment?.enabled) {
    return "";
  }

  if (installment.status === "cancelled" || installment.cancelledAt) {
    return "cancelled";
  }

  if (Number(installment.remainingBalance || 0) <= 0) {
    return "completed";
  }

  const hasPendingVerification = (installment.payments || []).some((payment) => payment.status === "pending_verification");

  if (hasPendingVerification) {
    return "pending_verification";
  }

  const nextDueDate = installment.nextDueDate ? new Date(installment.nextDueDate) : null;

  if (nextDueDate && !Number.isNaN(nextDueDate.getTime())) {
    const graceMs = Math.max(0, Number(installment.gracePeriodDays || 0)) * 24 * 60 * 60 * 1000;
    if (Date.now() > nextDueDate.getTime() + graceMs) {
      return "late";
    }
  }

  return "active";
}

function normalizeInstallment(order) {
  if (!order?.installment?.enabled) {
    return order?.installment || null;
  }

  const nextStatus = deriveInstallmentStatus(order.installment);
  order.installment.status = nextStatus;

  if (nextStatus === "completed") {
    order.installment.remainingBalance = 0;
  }

  return order.installment;
}

function getNextInstallmentScheduleItem(installment) {
  return (installment?.schedule || []).find((entry) => entry.status !== "paid" && entry.status !== "cancelled") || null;
}

function isInstallmentReadyForShipment(order) {
  if (!order?.installment?.enabled || order.installment.status === "cancelled") {
    return false;
  }

  return Boolean(order.installment.releasedEarly || Number(order.installment.remainingBalance || 0) <= 0);
}

function recalculateInstallmentState(order) {
  if (!order?.installment?.enabled) {
    return;
  }

  const totalWithServiceFee = Number(order.installment.totalWithServiceFee || 0);
  const approvedPaymentsTotal = roundMoney(
    (order.installment.payments || [])
      .filter((payment) => payment.status === "approved")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  order.installment.amountPaid = approvedPaymentsTotal;
  order.installment.remainingBalance = roundMoney(Math.max(0, totalWithServiceFee - approvedPaymentsTotal));
  order.installment.lastPaidAt = (order.installment.payments || [])
    .filter((payment) => payment.status === "approved" && payment.verifiedAt)
    .sort((left, right) => new Date(right.verifiedAt) - new Date(left.verifiedAt))[0]?.verifiedAt || order.installment.lastPaidAt;

  if (order.installment.cancelledAt) {
    order.installment.status = "cancelled";
    return;
  }

  if (approvedPaymentsTotal >= totalWithServiceFee || (order.installment.status === "completed" && Number(order.installment.remainingBalance || 0) <= 0)) {
    order.installment.amountPaid = totalWithServiceFee;
    order.installment.remainingBalance = 0;
    order.installment.nextDueDate = null;
    order.installment.status = "completed";
    return;
  }

  const nextScheduleItem = getNextInstallmentScheduleItem(order.installment);
  order.installment.nextDueDate = nextScheduleItem?.dueDate || null;
  order.installment.status = deriveInstallmentStatus(order.installment);
}

function getLatestTimelineDate(order, status) {
  const matches = (order.timeline || [])
    .filter((entry) => String(entry.status || "").toLowerCase() === String(status || "").toLowerCase())
    .map((entry) => new Date(entry.at))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return matches[0] || null;
}

function formatRefundReason(reason) {
  return refundReasonLabels[reason] || "Refund request";
}

function getRefundEligibility(order, settings) {
  if (String(order.orderType || "regular").toLowerCase() === "installment") {
    return {
      canRequest: false,
      reason: "Installment payments are non-refundable under the installment agreement.",
      eligibleStatuses: [],
      refundWindowDays: 0,
      eligibleUntil: null
    };
  }

  const policy = getRefundPolicy(settings);
  const existingRefund = order.refundRequest;

  if (existingRefund?.status) {
    return {
      canRequest: false,
      reason: "A refund request already exists for this order.",
      eligibleStatuses: policy.eligibleStatuses,
      refundWindowDays: policy.refundWindowDays,
      eligibleUntil: null
    };
  }

  if (String(order.status || "").toLowerCase() === "cancelled") {
    return {
      canRequest: false,
      reason: "Cancelled orders cannot request another refund.",
      eligibleStatuses: policy.eligibleStatuses,
      refundWindowDays: policy.refundWindowDays,
      eligibleUntil: null
    };
  }

  let qualifyingDate = null;
  let qualifyingStatus = "";
  const orderStatus = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment?.status || "").toLowerCase();

  if (policy.eligibleStatuses.includes("delivered") && orderStatus === "delivered") {
    qualifyingDate = getLatestTimelineDate(order, "delivered") || new Date(order.updatedAt || order.createdAt || Date.now());
    qualifyingStatus = "delivered";
  }

  if (!qualifyingDate && policy.eligibleStatuses.includes("paid")) {
    const orderProgressAllowsPaidRefund = ["paid", "verified", "packed", "processing", "shipped", "out_for_delivery", "delivered"].includes(orderStatus);

    if (paymentStatus === "paid" || orderProgressAllowsPaidRefund) {
      qualifyingDate = getLatestTimelineDate(order, "paid") || new Date(order.updatedAt || order.createdAt || Date.now());
      qualifyingStatus = "paid";
    }
  }

  if (!qualifyingDate) {
    return {
      canRequest: false,
      reason: "Refunds are only available for eligible paid or delivered orders.",
      eligibleStatuses: policy.eligibleStatuses,
      refundWindowDays: policy.refundWindowDays,
      eligibleUntil: null
    };
  }

  const eligibleUntil = new Date(qualifyingDate);
  eligibleUntil.setDate(eligibleUntil.getDate() + policy.refundWindowDays);

  if (policy.refundWindowDays > 0 && Date.now() > eligibleUntil.getTime()) {
    return {
      canRequest: false,
      reason: `The ${policy.refundWindowDays}-day refund window has already passed.`,
      eligibleStatuses: policy.eligibleStatuses,
      refundWindowDays: policy.refundWindowDays,
      basedOn: qualifyingStatus,
      eligibleUntil
    };
  }

  return {
    canRequest: true,
    reason: "",
    eligibleStatuses: policy.eligibleStatuses,
    refundWindowDays: policy.refundWindowDays,
    basedOn: qualifyingStatus,
    eligibleUntil
  };
}

async function ensureOrderReference(order) {
  if (!order || order.orderNumber) {
    return order;
  }

  await order.save();
  return order;
}

async function ensureOrderReferences(orders = []) {
  await Promise.all(orders.map((order) => ensureOrderReference(order)));
  return orders;
}

function serializeOrder(order, settings) {
  const source = typeof order.toObject === "function" ? order.toObject() : order;
  normalizeInstallment(source);
  const refundEligibility = settings ? getRefundEligibility(source, settings) : null;

  return {
    ...source,
    orderNumber: source.orderNumber || "",
    trackingStatus: getCustomerTrackingStatus(source),
    refundRequest: source.refundRequest || null,
    installment: source.installment || null,
    refundEligibility
  };
}

async function findOrderByReference(reference) {
  const normalizedReference = normalizeOrderReference(reference);

  if (!normalizedReference) {
    throw new ApiError(400, "Order ID is required");
  }

  const filters = [{ orderNumber: normalizedReference }];

  if (mongoose.Types.ObjectId.isValid(normalizedReference)) {
    filters.push({ _id: normalizedReference });
  }

  const order = await Order.findOne({ $or: filters }).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  await ensureOrderReference(order);
  return order;
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
      sellerId: product.owner || null,
      sellerName: product.vendorType === "seller"
        ? product.sellerName || product.owner?.sellerProfile?.storeName || ""
        : "",
      vendorType: product.vendorType || "admin",
      commissionRate: Number(product.commissionRate || 10),
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
  const {
    items,
    shippingAddress = {},
    paymentMethod = "stripe",
    promoCode = "",
    purchaseMode = "full",
    installmentAgreementAccepted = false
  } = req.body;

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

  const orderType = String(purchaseMode || "full").toLowerCase() === "installment" ? "installment" : "regular";
  const installmentConfig = getInstallmentConfig(storeSettings);

  if (orderType === "installment" && !installmentConfig.enabled) {
    throw new ApiError(400, "Installment checkout is not enabled right now");
  }

  if (orderType === "installment" && paymentMethod === "cod") {
    throw new ApiError(400, "Cash on Delivery is not available for installment purchases");
  }

  const normalizedAddress = normalizeShippingAddress(shippingAddress, req.user);
  validateShippingAddress(normalizedAddress);

  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  let normalizedItems = await buildNormalizedItems(items, products);
  normalizedItems = await maybeAddFreeGift(normalizedItems, storeSettings);

  if (orderType === "installment" && normalizedItems.some((item) => item.vendorType === "seller")) {
    throw new ApiError(400, "Seller marketplace products are not yet eligible for installment checkout");
  }

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
  const installmentPlan = orderType === "installment" ? buildInstallmentPlan(total, storeSettings) : null;

  if (orderType === "installment" && !installmentPlan.valid) {
    throw new ApiError(400, "Installment plan is incomplete. Please ask the store admin to set a valid down payment and schedule.");
  }

  if (orderType === "installment" && !installmentAgreementAccepted) {
    throw new ApiError(400, "You must accept the non-refundable installment agreement");
  }

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
    orderType,
    payment: {
      method: paymentMethod,
      status: "pending",
      instructions: orderType === "installment"
        ? `Down payment of ${roundMoney(installmentPlan.downPaymentAmount)} is required before the installment plan starts. Payments made are non-refundable under the installment agreement.`
        : getPaymentInstructions(paymentMethod, storeSettings)
    },
    promoCode: discountSummary.matchedPromoCode,
    status: "pending",
    installment: orderType === "installment"
      ? {
          ...installmentPlan,
          agreementAccepted: true,
          agreementAcceptedAt: new Date(),
          amountPaid: 0,
          remainingBalance: installmentPlan.financedAmount,
          adminNotes: "Installment created. Waiting for down payment verification."
        }
      : undefined,
    notes: [
      shippingSummary.matchedLocation ? `Shipping zone: ${shippingSummary.matchedLocation}` : "",
      paymentMethod === "cod" ? "COD order received. Wait for order verification before packing." : "",
      requiresProof(storeSettings, paymentMethod) ? "Proof of payment required before fulfillment." : "",
      orderType === "installment"
        ? `Installment plan: ${installmentPlan.frequency} x${installmentPlan.paymentCount}, down payment ${roundMoney(installmentPlan.downPaymentAmount)}, all payments non-refundable.`
        : "",
      ...discountSummary.appliedLabels
    ]
      .filter(Boolean)
      .join(" | "),
    timeline: [
      createTimeline("pending"),
      ...(orderType === "installment"
        ? [createTimeline("pending", "Installment agreement accepted and down payment required")]
        : [])
    ]
  });

  await updateInventoryForOrderItems(order.items);
  await createNotifications({
    settings: storeSettings,
    settingKey: "orderPlaced",
    type: "order_placed",
    title: "Order placed",
    message: `Order ${order.orderNumber || order._id.toString()} has been placed successfully.`,
    link: `/orders`,
    data: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber || order._id.toString(),
      orderType
    },
    recipients: [
      {
        userId: req.user._id,
        title: "Your order has been placed",
        message: `We received your ${orderType} order ${order.orderNumber || order._id.toString()}.`,
        link: `/orders`
      },
      {
        role: "admin",
        title: "New order received",
        message: `Order ${order.orderNumber || order._id.toString()} was placed by ${req.user.email || req.user.name}.`,
        link: "/admin/orders"
      }
    ]
  });

  res.status(201).json({
    ...serializeOrder(order, storeSettings),
    paymentMessage: orderType === "installment"
      ? `Installment order created. Submit your non-refundable down payment of ${roundMoney(installmentPlan.downPaymentAmount)} for admin verification.`
      : getPaymentInstructions(paymentMethod, storeSettings)
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  await ensureOrderReferences(orders);
  res.json(orders.map((order) => serializeOrder(order, storeSettings)));
});

export const trackOrder = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await findOrderByReference(req.params.id);

  if (!canAccessOrder(order, req)) {
    throw new ApiError(403, "You cannot view this order");
  }

  res.json(serializeOrder(order, storeSettings));
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const searchValue = normalizeOrderReference(req.query.search);
  let filter = {};

  if (searchValue) {
    const orderNumberFilter = {
      orderNumber: { $regex: escapeRegex(searchValue), $options: "i" }
    };

    filter = mongoose.Types.ObjectId.isValid(searchValue)
      ? { $or: [orderNumberFilter, { _id: searchValue }] }
      : orderNumberFilter;
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate("user", "name email");
  await ensureOrderReferences(orders);
  res.json(orders.map((order) => serializeOrder(order, storeSettings)));
});

export const getMyInstallments = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const orders = await Order.find({ user: req.user._id, orderType: "installment" }).sort({ createdAt: -1 });
  await ensureOrderReferences(orders);
  res.json(orders.map((order) => serializeOrder(order, storeSettings)));
});

export const getAllInstallments = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const installments = await Order.find({ orderType: "installment" }).sort({ createdAt: -1 }).populate("user", "name email");
  await ensureOrderReferences(installments);
  res.json(installments.map((order) => serializeOrder(order, storeSettings)));
});

export const getSellerOrders = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const sellerId = req.user._id;
  const orders = await Order.find({ "items.sellerId": sellerId }).sort({ createdAt: -1 }).populate("user", "name email");
  await ensureOrderReferences(orders);

  res.json(
    orders.map((order) => {
      const serialized = serializeOrder(order, storeSettings);
      const sellerItems = (serialized.items || []).filter((item) => String(item.sellerId) === String(sellerId));
      const sellerGross = sellerItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const sellerCommission = sellerItems.reduce(
        (sum, item) => sum + ((Number(item.price || 0) * Number(item.quantity || 0) * Number(item.commissionRate || 10)) / 100),
        0
      );

      return {
        ...serialized,
        sellerItems,
        sellerGross,
        sellerCommission,
        sellerNet: sellerGross - sellerCommission
      };
    })
  );
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

  await ensureOrderReference(order);
  res.json(serializeOrder(order, storeSettings));
});

export const getOrderByReference = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await findOrderByReference(req.params.reference);

  if (!canAccessOrder(order, req)) {
    throw new ApiError(403, "You cannot view this order");
  }

  res.json(serializeOrder(order, storeSettings));
});

export const submitInstallmentPayment = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Installment order not found");
  }

  if (!canAccessOrder(order, req) || req.user?.role === "admin") {
    throw new ApiError(403, "Only the installment owner can submit a payment");
  }

  if (order.orderType !== "installment" || !order.installment?.enabled) {
    throw new ApiError(400, "This order is not an installment transaction");
  }

  if (["completed", "cancelled"].includes(order.installment.status)) {
    throw new ApiError(400, "This installment can no longer accept payments");
  }

  if ((order.installment.payments || []).some((payment) => payment.status === "pending_verification")) {
    throw new ApiError(400, "There is already a payment waiting for admin verification");
  }

  if (!req.file) {
    throw new ApiError(400, "Payment proof image is required");
  }

  const amount = roundMoney(req.body.amount);
  const method = String(req.body.method || "").trim();
  const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
  const proofImage = await uploadProofImage(req.file);

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Please enter a valid payment amount");
  }

  if (!["gcash", "maya", "bank_transfer", "paypal", "stripe"].includes(method)) {
    throw new ApiError(400, "Please choose a valid payment method");
  }

  const isDownPaymentPending = !(order.installment.payments || []).some(
    (payment) => payment.phase === "down_payment" && payment.status === "approved"
  );
  const nextScheduleItem = getNextInstallmentScheduleItem(order.installment);
  const phase = isDownPaymentPending ? "down_payment" : "installment";

  const paymentRecord = {
    amount,
    method,
    phase,
    paymentDate,
    proofImage,
    status: "pending_verification",
    submittedAt: new Date(),
    scheduleSequence: phase === "installment" ? nextScheduleItem?.sequence || null : null
  };

  order.installment.payments.push(paymentRecord);

  if (phase === "installment" && nextScheduleItem) {
    nextScheduleItem.status = "pending_verification";
    nextScheduleItem.paymentId = paymentRecord._id;
  }

  order.installment.status = "pending_verification";
  order.timeline.push(createTimeline("pending", phase === "down_payment" ? "Down payment submitted for installment verification" : "Installment payment submitted for verification"));
  order.notes = [order.notes, `${phase === "down_payment" ? "Down payment" : "Installment payment"} submitted for admin verification.`]
    .filter(Boolean)
    .join(" | ");
  await order.save();
  await createNotifications({
    settings: storeSettings,
    type: "installment_payment_submitted",
    title: "Installment payment submitted",
    message: `Installment payment for order ${order.orderNumber || order._id.toString()} is waiting for verification.`,
    link: `/admin/installments`,
    data: {
      orderId: order._id.toString(),
      paymentId: paymentRecord._id,
      phase
    },
    recipients: [
      {
        role: "admin",
        title: "Installment payment submitted",
        message: `${req.user.name || req.user.email} submitted an installment ${phase.replace("_", " ")} for order ${order.orderNumber || order._id.toString()}.`,
        link: `/admin/installments`
      }
    ]
  });

  res.status(201).json({
    message: "Installment payment submitted successfully",
    order: serializeOrder(order, storeSettings)
  });
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

  order.payment.proofImage = await uploadProofImage(req.file);
  order.payment.proofUploadedAt = new Date();
  order.timeline.push(createTimeline("pending", "Payment proof submitted for review"));
  order.notes = [order.notes, "Payment proof uploaded by customer."]
    .filter(Boolean)
    .join(" | ");
  await order.save();

  res.json({
    message: "Payment proof uploaded successfully",
    order: serializeOrder(order, storeSettings)
  });
});

export const reviewInstallmentPayment = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Installment order not found");
  }

  if (order.orderType !== "installment" || !order.installment?.enabled) {
    throw new ApiError(400, "This order is not an installment transaction");
  }

  const payment = (order.installment.payments || []).find(
    (entry) => String(entry._id) === String(req.params.paymentId)
  );

  if (!payment) {
    throw new ApiError(404, "Installment payment not found");
  }

  const decision = String(req.body.status || "").trim().toLowerCase();
  const adminNote = String(req.body.adminNote || "").trim();

  if (!["approved", "rejected"].includes(decision)) {
    throw new ApiError(400, "Invalid installment payment decision");
  }

  payment.status = decision;
  payment.adminNote = adminNote;
  payment.verifiedAt = new Date();

  if (decision === "approved") {
    const matchedSchedule = payment.scheduleSequence
      ? order.installment.schedule.find((entry) => entry.sequence === payment.scheduleSequence)
      : null;

    if (matchedSchedule) {
      matchedSchedule.status = "paid";
      matchedSchedule.paidAt = new Date();
      matchedSchedule.paymentId = payment._id;
    }

    order.timeline.push(
      createTimeline(
        "paid",
        payment.phase === "down_payment"
          ? "Down payment approved for installment order"
          : `Installment payment ${payment.scheduleSequence || ""} approved`.trim()
      )
    );
  } else {
    const matchedSchedule = payment.scheduleSequence
      ? order.installment.schedule.find((entry) => entry.sequence === payment.scheduleSequence)
      : null;

    if (matchedSchedule) {
      matchedSchedule.status = deriveInstallmentStatus(order.installment) === "late" ? "late" : "scheduled";
      matchedSchedule.paymentId = "";
    }

    order.timeline.push(
      createTimeline(
        "pending",
        payment.phase === "down_payment"
          ? "Down payment rejected by admin"
          : `Installment payment ${payment.scheduleSequence || ""} rejected`
      )
    );
  }

  recalculateInstallmentState(order);

  if (order.installment.status === "completed") {
    order.payment.status = "paid";

    if (["pending", "verified", "paid"].includes(String(order.status || "").toLowerCase())) {
      order.status = "processing";
      order.timeline.push(createTimeline("processing", "Installment fully paid and ready for shipment"));
    } else {
      order.timeline.push(createTimeline("paid", "Installment fully paid and ready for shipment"));
    }
  }

  order.notes = [order.notes, `Installment payment ${decision}${adminNote ? `: ${adminNote}` : "."}`]
    .filter(Boolean)
    .join(" | ");
  await order.save();
  await createNotifications({
    settings: storeSettings,
    settingKey: "paymentReceived",
    type: decision === "approved" ? "payment_approved" : "payment_rejected",
    title: decision === "approved" ? "Installment payment approved" : "Installment payment rejected",
    message:
      decision === "approved"
        ? `Your installment payment for order ${order.orderNumber || order._id.toString()} has been approved.`
        : `Your installment payment for order ${order.orderNumber || order._id.toString()} was rejected.`,
    link: `/installments`,
    data: {
      orderId: order._id.toString(),
      paymentId: payment._id,
      paymentStatus: decision
    },
    recipients: [
      {
        userId: order.user?._id || order.user,
        title: decision === "approved" ? "Installment payment approved" : "Installment payment rejected",
        message:
          decision === "approved"
            ? `Your installment payment for order ${order.orderNumber || order._id.toString()} has been approved.`
            : `Your installment payment for order ${order.orderNumber || order._id.toString()} was rejected.`,
        link: `/installments`
      },
      {
        role: "admin",
        title: decision === "approved" ? "Installment payment approved" : "Installment payment rejected",
        message:
          decision === "approved"
            ? `An installment payment for order ${order.orderNumber || order._id.toString()} was approved.`
            : `An installment payment for order ${order.orderNumber || order._id.toString()} was rejected.`,
        link: `/admin/installments`
      }
    ]
  });

  res.json({
    message: `Installment payment ${decision}.`,
    order: serializeOrder(order, storeSettings)
  });
});

export const requestRefund = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(storeSettings);
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!canAccessOrder(order, req) || req.user?.role === "admin") {
    throw new ApiError(403, "Only the customer who owns this order can request a refund");
  }

  const eligibility = getRefundEligibility(order, storeSettings);

  if (!eligibility.canRequest) {
    throw new ApiError(400, eligibility.reason || "This order is not eligible for a refund request");
  }

  const reason = String(req.body.reason || "").trim().toLowerCase();
  const message = String(req.body.message || "").trim();
  const proofImage = req.file ? await uploadProofImage(req.file) : "";

  if (!reason) {
    throw new ApiError(400, "Please choose a refund reason");
  }

  order.refundRequest = {
    status: "pending",
    reason,
    message,
    proofImage,
    requestedAt: new Date(),
    updatedAt: new Date(),
    adminMessage: ""
  };
  order.timeline.push(createTimeline("refund_pending", `${formatRefundReason(reason)} refund request submitted`));
  order.notes = [order.notes, `Refund requested: ${formatRefundReason(reason)}.`]
    .filter(Boolean)
    .join(" | ");
  await order.save();
  await createNotifications({
    settings: storeSettings,
    type: "refund_requested",
    title: "Refund request submitted",
    message: `A refund request was submitted for order ${order.orderNumber || order._id.toString()}.`,
    link: `/admin/orders`,
    data: {
      orderId: order._id.toString(),
      reason
    },
    recipients: [
      {
        role: "admin",
        title: "Refund request submitted",
        message: `A refund request was submitted for order ${order.orderNumber || order._id.toString()}.`,
        link: `/admin/orders`
      }
    ]
  });

  res.status(201).json({
    message: "Refund request submitted successfully",
    order: serializeOrder(order, storeSettings)
  });
});

export const updateRefundStatus = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!order.refundRequest?.status) {
    throw new ApiError(404, "No refund request found for this order");
  }

  const nextStatus = String(req.body.status || "").trim().toLowerCase();
  const adminMessage = String(req.body.adminMessage || "").trim();

  if (!["pending", "approved", "rejected", "refunded"].includes(nextStatus)) {
    throw new ApiError(400, "Invalid refund status");
  }

  order.refundRequest.status = nextStatus;
  order.refundRequest.adminMessage = adminMessage;
  order.refundRequest.updatedAt = new Date();

  if (["approved", "rejected", "refunded"].includes(nextStatus)) {
    order.refundRequest.reviewedAt = new Date();
  }

  if (nextStatus === "refunded") {
    order.refundRequest.refundedAt = new Date();
  }

  const refundTimelineLabels = {
    pending: "Refund request reopened",
    approved: "Refund approved by admin",
    rejected: "Refund rejected by admin",
    refunded: "Refund marked as completed"
  };

  order.timeline.push(createTimeline(
    nextStatus === "refunded" ? "refunded" : `refund_${nextStatus}`,
    refundTimelineLabels[nextStatus]
  ));
  order.notes = [order.notes, `Refund ${nextStatus}${adminMessage ? `: ${adminMessage}` : "."}`]
    .filter(Boolean)
    .join(" | ");

  await order.save();
  await createNotifications({
    settings: storeSettings,
    type: `refund_${nextStatus}`,
    title:
      nextStatus === "approved"
        ? "Refund request approved"
        : nextStatus === "rejected"
          ? "Refund request rejected"
          : nextStatus === "refunded"
            ? "Refund completed"
            : "Refund updated",
    message:
      nextStatus === "approved"
        ? `Your refund request for order ${order.orderNumber || order._id.toString()} was approved.`
        : nextStatus === "rejected"
          ? `Your refund request for order ${order.orderNumber || order._id.toString()} was rejected.`
          : nextStatus === "refunded"
            ? `Your refund for order ${order.orderNumber || order._id.toString()} has been completed.`
            : `Your refund request for order ${order.orderNumber || order._id.toString()} was updated.`,
    link: `/orders`,
    data: {
      orderId: order._id.toString(),
      refundStatus: nextStatus
    },
    recipients: [
      {
        userId: order.user?._id || order.user,
        title:
          nextStatus === "approved"
            ? "Refund request approved"
            : nextStatus === "rejected"
              ? "Refund request rejected"
              : nextStatus === "refunded"
                ? "Refund completed"
                : "Refund updated",
        message:
          nextStatus === "approved"
            ? `Your refund request for order ${order.orderNumber || order._id.toString()} was approved.`
            : nextStatus === "rejected"
              ? `Your refund request for order ${order.orderNumber || order._id.toString()} was rejected.`
              : nextStatus === "refunded"
                ? `Your refund for order ${order.orderNumber || order._id.toString()} has been completed.`
                : `Your refund request for order ${order.orderNumber || order._id.toString()} was updated.`,
        link: `/orders`
      }
    ]
  });

  res.json({
    message: `Refund marked as ${nextStatus}`,
    order: serializeOrder(order, storeSettings)
  });
});

export const updateInstallmentStatus = asyncHandler(async (req, res) => {
  const storeSettings = await getOrCreateStoreSettings();
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) {
    throw new ApiError(404, "Installment order not found");
  }

  if (order.orderType !== "installment" || !order.installment?.enabled) {
    throw new ApiError(400, "This order is not an installment transaction");
  }

  const action = String(req.body.action || "").trim().toLowerCase();
  const note = String(req.body.note || "").trim();
  const scheduleSequence = Number(req.body.scheduleSequence || 0);
  let shouldRecalculate = true;

  if (action === "cancel") {
    order.installment.status = "cancelled";
    order.installment.cancelledAt = new Date();
    order.installment.cancelledReason = note || "Cancelled / forfeited by admin";
    order.status = "cancelled";
    order.timeline.push(createTimeline("cancelled", "Installment marked as cancelled / forfeited"));
  } else if (action === "extend_due_date") {
    const matchedSchedule = order.installment.schedule.find((entry) => entry.sequence === scheduleSequence);

    if (!matchedSchedule) {
      throw new ApiError(404, "Installment schedule item not found");
    }

    const nextDueDate = req.body.nextDueDate ? new Date(req.body.nextDueDate) : null;

    if (!nextDueDate || Number.isNaN(nextDueDate.getTime())) {
      throw new ApiError(400, "A valid next due date is required");
    }

    matchedSchedule.dueDate = nextDueDate;
    order.installment.nextDueDate = nextDueDate;
    order.timeline.push(createTimeline("pending", `Installment due date extended for payment ${scheduleSequence}`));
  } else if (action === "approve_early_release") {
    order.installment.releasedEarly = true;
    order.installment.earlyReleaseApprovedAt = new Date();
    order.installment.earlyReleaseApprovedBy = req.user?._id;
    order.timeline.push(createTimeline("processing", "Admin approved early product release for installment order"));
  } else if (action === "add_note") {
    order.installment.adminNotes = [order.installment.adminNotes, note].filter(Boolean).join(" | ");
    order.timeline.push(createTimeline("pending", "Admin updated installment notes"));
  } else if (action === "mark_completed") {
    order.installment.status = "completed";
    order.installment.amountPaid = Number(order.installment.totalWithServiceFee || 0);
    order.installment.remainingBalance = 0;
    order.installment.nextDueDate = null;
    order.payment.status = "paid";
    order.installment.schedule = (order.installment.schedule || []).map((entry) => ({
      ...entry,
      status: "paid",
      paidAt: entry.paidAt || new Date()
    }));
    if (["pending", "verified", "paid"].includes(String(order.status || "").toLowerCase())) {
      order.status = "processing";
    }
    order.timeline.push(createTimeline("processing", "Installment manually marked as fully paid and ready for shipment"));
    shouldRecalculate = false;
  } else {
    throw new ApiError(400, "Unsupported installment action");
  }

  if (shouldRecalculate) {
    recalculateInstallmentState(order);
  }
  await order.save();
  if (action === "cancel") {
    await createNotifications({
      settings: storeSettings,
      type: "installment_cancelled",
      title: "Installment cancelled",
      message: `Your installment order ${order.orderNumber || order._id.toString()} was cancelled.`,
      link: `/installments`,
      data: {
        orderId: order._id.toString(),
        action
      },
      recipients: [
        {
          userId: order.user?._id || order.user,
          title: "Installment cancelled",
          message: `Your installment order ${order.orderNumber || order._id.toString()} was cancelled.`,
          link: `/installments`
        }
      ]
    });
  } else if (action === "extend_due_date") {
    await createNotifications({
      settings: storeSettings,
      type: "installment_due_updated",
      title: "Installment due date updated",
      message: `The due date for installment order ${order.orderNumber || order._id.toString()} was updated.`,
      link: `/installments`,
      data: {
        orderId: order._id.toString(),
        action,
        scheduleSequence
      },
      recipients: [
        {
          userId: order.user?._id || order.user,
          title: "Installment due date updated",
          message: `The due date for installment order ${order.orderNumber || order._id.toString()} was updated.`,
          link: `/installments`
        }
      ]
    });
  } else if (action === "approve_early_release") {
    await createNotifications({
      settings: storeSettings,
      type: "installment_release_approved",
      title: "Installment release approved",
      message: `Your installment order ${order.orderNumber || order._id.toString()} is ready for release.`,
      link: `/installments`,
      data: {
        orderId: order._id.toString(),
        action
      },
      recipients: [
        {
          userId: order.user?._id || order.user,
          title: "Installment release approved",
          message: `Your installment order ${order.orderNumber || order._id.toString()} is ready for release.`,
          link: `/installments`
        }
      ]
    });
  } else if (action === "mark_completed") {
    await createNotifications({
      settings: storeSettings,
      type: "installment_completed",
      title: "Installment completed",
      message: `Your installment order ${order.orderNumber || order._id.toString()} is fully paid.`,
      link: `/installments`,
      data: {
        orderId: order._id.toString(),
        action
      },
      recipients: [
        {
          userId: order.user?._id || order.user,
          title: "Installment completed",
          message: `Your installment order ${order.orderNumber || order._id.toString()} is fully paid.`,
          link: `/installments`
        },
        {
          role: "admin",
          title: "Installment completed",
          message: `Installment order ${order.orderNumber || order._id.toString()} was manually marked as completed.`,
          link: `/admin/installments`
        }
      ]
    });
  }

  res.json({
    message: "Installment updated successfully.",
    order: serializeOrder(order, storeSettings)
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const storeSettings = await getOrCreateStoreSettings();
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const previousStatus = order.status;
  const normalizedNextStatus = String(status || "").trim().toLowerCase();
  const normalizedPaymentStatus = String(paymentStatus || order.payment?.status || "").trim().toLowerCase();

  if (normalizedNextStatus === "delivered") {
    const canDeliverByPayment =
      normalizedPaymentStatus === "paid" ||
      String(order.payment?.method || "").toLowerCase() === "cod" ||
      (order.orderType === "installment" && isInstallmentReadyForShipment(order));
    const canDeliverByStage = ["shipped", "out_for_delivery"].includes(String(order.status || "").toLowerCase());

    if (!canDeliverByPayment) {
      throw new ApiError(400, "Only paid orders can be marked as delivered");
    }

    if (!canDeliverByStage) {
      throw new ApiError(400, "Orders must be shipped or out for delivery before they can be marked as delivered");
    }
  }

  if (
    order.orderType === "installment" &&
    order.installment?.enabled &&
    ["processing", "packed", "shipped", "out_for_delivery"].includes(normalizedNextStatus) &&
    !isInstallmentReadyForShipment(order)
  ) {
    throw new ApiError(400, "This installment cannot move to shipping stages until release requirements are completed");
  }

  if (status && status !== order.status) {
    order.status = status;
    order.timeline.push(createTimeline(status));

    if (order.orderType === "installment" && order.installment?.enabled) {
      if (status === "cancelled") {
        order.installment.status = "cancelled";
        order.installment.cancelledAt = new Date();
      }

      if (status === "delivered" && Number(order.installment.remainingBalance || 0) <= 0) {
        order.installment.status = "completed";
      }
    }
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
  if (status && status !== previousStatus && order.user) {
    await createNotifications({
      type: "order_status_updated",
      title: "Order status updated",
      message: `Your order ${order.orderNumber || order._id.toString()} is now ${String(status).replaceAll("_", " ")}.`,
      link: `/orders`,
      data: {
        orderId: order._id.toString(),
        status,
        paymentStatus: order.payment?.status
      },
      recipients: [
        {
          userId: order.user,
          title: "Order status updated",
          message: `Your order ${order.orderNumber || order._id.toString()} is now ${String(status).replaceAll("_", " ")}.`,
          link: `/orders`
        }
      ]
    });
  }
  res.json(serializeOrder(order, storeSettings));
});
