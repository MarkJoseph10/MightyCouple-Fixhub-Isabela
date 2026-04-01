import { getOrderReference } from "./orders";

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function printOrderReceipt(order, storeName = "Mighty Couple") {
  if (!order || typeof window === "undefined") {
    return false;
  }

  const receiptWindow = window.open("", "_blank", "width=900,height=700");

  if (!receiptWindow) {
    return false;
  }

  const itemsHtml = (order.items || [])
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.variantLabel || "-")}</td>
        <td>${Number(item.quantity || 0)}</td>
        <td>${peso(item.price)}</td>
        <td>${peso(Number(item.price || 0) * Number(item.quantity || 0))}</td>
      </tr>
    `)
    .join("");

  const shippingAddress = [
    order.shippingAddress?.fullName,
    order.shippingAddress?.line1,
    [order.shippingAddress?.city, order.shippingAddress?.province].filter(Boolean).join(", "),
    [order.shippingAddress?.postalCode, order.shippingAddress?.country].filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join("<br />");

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(storeName)} Receipt ${escapeHtml(getOrderReference(order))}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          h1, h2, h3, p { margin: 0; }
          .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .muted { color: #475569; }
          .card { border: 1px solid #cbd5e1; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px 8px; font-size: 14px; }
          th { background: #f8fafc; }
          .totals { margin-left: auto; width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .totals-row strong { font-size: 18px; }
          @media print { body { margin: 16px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${escapeHtml(storeName)}</h1>
            <p class="muted">Order receipt / invoice</p>
          </div>
          <div style="text-align:right">
            <h2>${escapeHtml(getOrderReference(order))}</h2>
            <p class="muted">${escapeHtml(new Date(order.createdAt).toLocaleString())}</p>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <p class="muted">Customer</p>
            <h3 style="margin-top:8px">${escapeHtml(order.shippingAddress?.fullName || "Customer")}</h3>
            <p class="muted" style="margin-top:8px">${escapeHtml(order.shippingAddress?.email || "")}</p>
            <p class="muted">${escapeHtml(order.shippingAddress?.phone || "")}</p>
          </div>
          <div class="card">
            <p class="muted">Shipping address</p>
            <div style="margin-top:8px; line-height:1.6">${shippingAddress}</div>
          </div>
          <div class="card">
            <p class="muted">Payment</p>
            <h3 style="margin-top:8px">${escapeHtml(String(order.payment?.method || "").replaceAll("_", " "))}</h3>
            <p class="muted" style="margin-top:8px">Status: ${escapeHtml(order.payment?.status || "pending")}</p>
            <p class="muted">Order status: ${escapeHtml(order.status || "pending")}</p>
          </div>
        </div>

        <div class="card">
          <p class="muted">Items</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>

        <div class="card totals">
          <div class="totals-row"><span>Subtotal</span><span>${peso(order.pricing?.subtotal)}</span></div>
          <div class="totals-row"><span>Shipping</span><span>${peso(order.pricing?.shipping)}</span></div>
          <div class="totals-row"><span>Tax</span><span>${peso(order.pricing?.tax)}</span></div>
          <div class="totals-row"><span>Discount</span><span>- ${peso(order.pricing?.discount)}</span></div>
          <div class="totals-row"><strong>Total</strong><strong>${peso(order.pricing?.total)}</strong></div>
        </div>
      </body>
    </html>
  `);

  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
  return true;
}
