import { useEffect, useState } from "react";
import api from "../../api/client";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { peso } from "../../utils/commerce";

export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const { data } = await api.get("/orders/mine");
        setOrders(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load orders.");
      }
    }

    loadOrders();
  }, []);

  if (!orders && !error) {
    return <LoadingScreen label="Loading your orders..." />;
  }

  return (
    <div className="page-shell py-10">
      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h1 className="text-3xl font-semibold text-white">My orders</h1>
        {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <div className="mt-6 space-y-4">
          {orders?.map((order) => (
            <div key={order._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">Order #{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                {order.items.map((item) => (
                  <div key={`${item.name}-${item.variantId || "default"}`} className="flex justify-between gap-3">
                    <div>
                      <span>{item.name} x {item.quantity}</span>
                      {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                    </div>
                    <span>{peso(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm text-slate-300 md:grid-cols-2">
                <div>
                  <p>Payment: {order.payment.status}</p>
                  <p className="capitalize">Method: {String(order.payment.method || "").replaceAll("_", " ")}</p>
                </div>
                <div className="md:text-right">
                  <p>Discount: -{peso(order.pricing.discount || 0)}</p>
                  <strong className="text-white">{peso(order.pricing.total)}</strong>
                </div>
              </div>
              {!!order.timeline?.length && (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Latest update</p>
                  <p className="mt-2 font-semibold text-white">{order.timeline[order.timeline.length - 1]?.label}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(order.timeline[order.timeline.length - 1]?.at).toLocaleString()}
                  </p>
                </div>
              )}
              {order.payment.instructions && (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  {order.payment.instructions}
                </div>
              )}
              {order.notes && (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  {order.notes}
                </div>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/track-order?orderId=${order._id}&email=${encodeURIComponent(order.shippingAddress?.email || "")}`)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition duration-300 hover:bg-white/5"
                >
                  Copy tracking link
                </button>
              </div>
            </div>
          ))}
          {!orders?.length && !error && (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">
              You do not have any orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
