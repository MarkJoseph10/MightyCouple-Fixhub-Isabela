import { useEffect, useState } from "react";
import api from "../../api/client";
import { peso } from "../../utils/commerce";
import { getOrderReference } from "../../utils/orders";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const { data } = await api.get("/orders/seller/mine");
        setOrders(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load seller orders.");
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Seller orders</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Orders containing your products</h1>
      </section>

      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <section className="space-y-4">
        {orders.length ? (
          orders.map((order) => (
            <div key={order._id} className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Order ID</p>
                  <p className="mt-2 font-semibold tracking-[0.08em] text-white">{getOrderReference(order)}</p>
                  <p className="text-sm text-slate-400">{order.user?.name || order.shippingAddress?.fullName || "Customer"}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold text-white">Gross {peso(order.sellerGross)}</p>
                  <p className="text-sm text-slate-400">Commission {peso(order.sellerCommission)}</p>
                  <p className="text-sm text-cyan-100">Net {peso(order.sellerNet)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {(order.sellerItems || []).map((item) => (
                  <div key={`${item.product}-${item.variantId || "default"}`} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-sm text-slate-400">Qty {item.quantity}{item.variantLabel ? ` | ${item.variantLabel}` : ""}</p>
                      </div>
                      <p className="font-semibold text-white">{peso(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel rounded-[32px] p-6 shadow-ambient text-slate-300">
            No orders for your products yet.
          </div>
        )}
      </section>
    </div>
  );
}
