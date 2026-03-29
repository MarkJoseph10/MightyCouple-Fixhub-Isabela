import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { peso } from "../../utils/commerce";

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofStatus, setProofStatus] = useState("");
  const uploadBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");

  async function handleTrack(event) {
    event?.preventDefault();
    setError("");

    try {
      const { data } = await api.get(`/orders/track/${orderId}`, {
        params: {
          email
        }
      });
      setOrder(data);
      setSearchParams({ orderId, email });
    } catch (requestError) {
      setOrder(null);
      setError(requestError.response?.data?.message || "Unable to track this order.");
    }
  }

  async function handleProofUpload(event) {
    event.preventDefault();
    setProofStatus("");
    setError("");

    if (!proofFile || !order) {
      setProofStatus("Choose an image first.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("image", proofFile);
      payload.append("email", email);

      await api.post(`/orders/${order._id}/payment-proof`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setProofStatus("Payment proof uploaded successfully.");
      setProofFile(null);
      await handleTrack();
    } catch (requestError) {
      setProofStatus(requestError.response?.data?.message || "Unable to upload payment proof.");
    }
  }

  useEffect(() => {
    if (orderId && email) {
      handleTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleTrack} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <h1 className="text-3xl font-semibold text-white">Track an order</h1>
          <p className="mt-2 text-sm text-slate-400">Useful for payment follow-up, shipment tracking, and old guest orders.</p>
          <div className="mt-6 space-y-4">
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Order ID"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email used at checkout"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
          </div>
          {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
          <button className="mt-6 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
            Track order
          </button>
        </form>

        <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <h2 className="text-2xl font-semibold text-white">Order status</h2>
          {!order && !error && <p className="mt-4 text-slate-300">Enter your order ID and email to see the latest status.</p>}

          {order && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">Order #{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Shipping</p>
                  <p className="mt-3 font-semibold text-white">{order.shippingAddress?.fullName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {order.shippingAddress?.line1}, {order.shippingAddress?.city}, {order.shippingAddress?.province}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Payment</p>
                  <p className="mt-3 font-semibold capitalize text-white">{String(order.payment?.method || "").replace("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-300">{order.payment?.instructions || "Awaiting update"}</p>
                  {order.payment?.proofImage && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Uploaded proof</p>
                      <img
                        src={`${uploadBaseUrl}${order.payment.proofImage}`}
                        alt="Payment proof"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {["gcash", "bank_transfer"].includes(order.payment?.method) && order.payment?.status === "pending" && (
                <form onSubmit={handleProofUpload} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Upload payment proof</p>
                  <p className="mt-2 text-sm text-slate-300">Send a screenshot of your GCash or bank transfer confirmation for review.</p>
                  <label className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-300">
                    <span>{proofFile ? proofFile.name : "Choose proof image"}</span>
                    <input type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="hidden" />
                  </label>
                  {proofStatus && <div className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">{proofStatus}</div>}
                  <button className="mt-4 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
                    Submit proof
                  </button>
                </form>
              )}

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Timeline</p>
                <div className="mt-4 space-y-4">
                  {(order.timeline || []).map((entry, index) => (
                    <div key={`${entry.status}-${index}`} className="flex gap-4">
                      <div className="mt-1 h-3 w-3 rounded-full bg-brand-400" />
                      <div>
                        <p className="font-semibold text-white">{entry.label}</p>
                        <p className="text-sm text-slate-400">{new Date(entry.at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Items</p>
                <div className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={`${item.name}-${item.variantId || "default"}`} className="flex justify-between gap-3 text-sm text-slate-300">
                      <div>
                        <span>{item.name} x {item.quantity}</span>
                        {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                      </div>
                      <span>{peso(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
                    <span>Total</span>
                    <span>{peso(order.pricing?.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
