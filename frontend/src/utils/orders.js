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
