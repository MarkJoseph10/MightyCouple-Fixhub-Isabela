export function getOrderReference(order) {
  if (!order) {
    return "";
  }

  if (order.orderNumber) {
    return order.orderNumber;
  }

  return String(order._id || "").slice(-6).toUpperCase();
}

export function buildTrackOrderUrl(orderReference, email = "") {
  const params = new URLSearchParams();

  if (orderReference) {
    params.set("orderId", orderReference);
  }

  if (email) {
    params.set("email", email);
  }

  return `/track-order?${params.toString()}`;
}

export async function copyText(value) {
  if (!value) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to a manual copy approach.
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  const successful = document.execCommand("copy");
  document.body.removeChild(textArea);
  return successful;
}

export function formatRefundReason(reason) {
  const labelMap = {
    defective_item: "Defective item",
    wrong_item: "Wrong item received",
    not_as_described: "Item not as described",
    damaged_in_transit: "Damaged in transit",
    changed_mind: "Changed mind",
    other: "Other"
  };

  return labelMap[reason] || "Refund request";
}

function findTimelineEntry(order, statuses = []) {
  const normalizedStatuses = statuses.map((status) => String(status || "").toLowerCase());
  return (order?.timeline || []).find((entry) => normalizedStatuses.includes(String(entry.status || "").toLowerCase()));
}

export function getOrderTrackingSteps(order) {
  if (!order) {
    return [];
  }

  const orderStatus = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment?.status || "").toLowerCase();
  const orderType = String(order.orderType || "").toLowerCase();
  const paidOrCollectible = paymentStatus === "paid" || String(order.payment?.method || "").toLowerCase() === "cod";
  const isCancelled = orderStatus === "cancelled";

  const steps = [
    {
      key: "placed",
      label: "Placed",
      headline: "Order received",
      detail: "The order is already saved and waiting for payment or store verification.",
      at: order.createdAt,
      complete: true,
      active: false
    },
    {
      key: "verified",
      label: "Verified",
      headline: paidOrCollectible ? "Payment cleared" : "Waiting for payment confirmation",
      detail: paidOrCollectible
        ? "Payment or collection method is confirmed, so the order can move into fulfillment."
        : "Admin is still checking proof of payment or waiting for payment to clear.",
      at: findTimelineEntry(order, ["verified", "paid"])?.at,
      complete: paidOrCollectible || ["verified", "packed", "processing", "shipped", "out_for_delivery", "delivered"].includes(orderStatus),
      active: !paidOrCollectible && !isCancelled
    },
    {
      key: "processing",
      label: "Preparing",
      headline: ["processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(orderStatus) ? "Store is preparing your items" : "Waiting for store prep",
      detail:
        orderType === "installment"
          ? "For installment orders, this stage begins after release requirements are complete."
          : "The store is packing and checking your order before handoff.",
      at: findTimelineEntry(order, ["processing", "packed"])?.at,
      complete: ["processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(orderStatus),
      active: ["verified", "paid"].includes(orderStatus)
    },
    {
      key: "shipped",
      label: "Shipped",
      headline: ["shipped", "out_for_delivery", "delivered"].includes(orderStatus) ? "Order is in transit" : "Waiting for shipment",
      detail: "Courier handoff is complete and tracking can continue from the order tracker.",
      at: findTimelineEntry(order, ["shipped", "out_for_delivery"])?.at,
      complete: ["shipped", "out_for_delivery", "delivered"].includes(orderStatus),
      active: ["processing", "packed"].includes(orderStatus)
    },
    {
      key: "delivery",
      label: "Delivery",
      headline: orderStatus === "delivered" ? "Delivered successfully" : orderStatus === "out_for_delivery" ? "Out for delivery" : "Waiting for final delivery",
      detail: orderStatus === "delivered" ? "The order reached the customer and the delivery cycle is complete." : "The order is on the final leg once courier updates this stage.",
      at: findTimelineEntry(order, ["delivered"])?.at,
      complete: orderStatus === "delivered",
      active: orderStatus === "out_for_delivery"
    }
  ];

  if (isCancelled) {
    return steps.map((step, index) => ({
      ...step,
      complete: index === 0 || Boolean(step.at),
      active: false
    }));
  }

  return steps;
}

export function getInstallmentCompletionSnapshot(order) {
  if (!order || String(order.orderType || "").toLowerCase() !== "installment") {
    return null;
  }

  const installmentStatus = String(order.installment?.status || "").toLowerCase();
  const orderStatus = String(order.status || "").toLowerCase();

  if (!["completed", "cancelled"].includes(installmentStatus) && !["processing", "shipped", "out_for_delivery", "delivered"].includes(orderStatus)) {
    return null;
  }

  const latestApprovedPayment = [...(order.installment?.payments || [])]
    .filter((payment) => String(payment.status || "").toLowerCase() === "approved")
    .sort((left, right) => new Date(right.submittedAt || right.createdAt || 0) - new Date(left.submittedAt || left.createdAt || 0))[0];

  const shippedAt = findTimelineEntry(order, ["shipped", "out_for_delivery"])?.at;
  const deliveredAt = findTimelineEntry(order, ["delivered"])?.at;

  let shippingLabel = "Awaiting release";
  let shippingDetail = "The installment is already settled, but shipment has not started yet.";

  if (orderStatus === "delivered") {
    shippingLabel = "Delivered";
    shippingDetail = deliveredAt ? `Delivered on ${new Date(deliveredAt).toLocaleString()}.` : "Delivered successfully.";
  } else if (orderStatus === "out_for_delivery") {
    shippingLabel = "Out for delivery";
    shippingDetail = "Customer should continue watching the tracker for final courier updates.";
  } else if (["shipped", "processing", "packed"].includes(orderStatus)) {
    shippingLabel = orderStatus === "shipped" ? "Shipped" : "Preparing shipment";
    shippingDetail = shippedAt
      ? `Shipment started on ${new Date(shippedAt).toLocaleString()}.`
      : "The store is already handling shipment for this completed installment.";
  }

  return {
    totalPaid: Number(order.installment?.amountPaid || 0),
    fullyPaidAt: latestApprovedPayment?.submittedAt || latestApprovedPayment?.createdAt || null,
    shippedAt,
    deliveredAt,
    shippingLabel,
    shippingDetail,
    canTrack: ["processing", "packed", "shipped", "out_for_delivery", "delivered"].includes(orderStatus)
  };
}
