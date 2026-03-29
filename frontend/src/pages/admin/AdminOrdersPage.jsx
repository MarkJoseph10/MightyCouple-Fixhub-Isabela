import { useEffect, useState } from "react";
import api from "../../api/client";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";

const statuses = ["pending", "verified", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];
const paymentStatuses = ["pending", "paid", "failed"];

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const uploadBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

  async function loadOrders() {
    try {
      const { data } = await api.get("/orders");
      setOrders(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load orders.");
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(orderId, status, paymentStatus) {
    try {
      await api.patch(`/orders/${orderId}/status`, { status, paymentStatus });
      setMessage("Order updated.");
      loadOrders();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order.");
    }
  }

  return (
    <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
      <h1 className="text-3xl font-semibold text-white">Order management</h1>
      <p className="mt-2 text-sm text-slate-400">Recommended workflow: pending, payment paid, verified, packed, shipped, delivered.</p>
      {message && <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-semibold text-white">{order.user?.name || "Guest"}</p>
                <p className="text-sm text-slate-400">{order.user?.email || "No email"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <OrderStatusBadge status={order.status} />
                <div className="flex flex-wrap gap-3">
                  <select
                    value={order.status}
                    onChange={(event) => updateStatus(order._id, event.target.value, order.payment.status)}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white outline-none"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={order.payment.status}
                    onChange={(event) => updateStatus(order._id, order.status, event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white outline-none"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        Payment: {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 lg:grid-cols-2">
              <div>
                <p>Items: {order.items.length}</p>
                <p>Placed: {new Date(order.createdAt).toLocaleString()}</p>
                <p>Ship to: {order.shippingAddress?.city}, {order.shippingAddress?.province}</p>
              </div>
              <div className="lg:text-right">
                <p>Payment: {order.payment.status}</p>
                <p className="capitalize">Method: {String(order.payment.method || "").replaceAll("_", " ")}</p>
                <p className="font-semibold text-white">{peso(order.pricing.total)}</p>
              </div>
            </div>
            {(order.payment.instructions || order.payment.proofImage) && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {order.payment.instructions && (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    {order.payment.instructions}
                  </div>
                )}
                {order.payment.proofImage && (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Payment proof</p>
                    <img
                      src={`${uploadBaseUrl}${order.payment.proofImage}`}
                      alt="Payment proof"
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
