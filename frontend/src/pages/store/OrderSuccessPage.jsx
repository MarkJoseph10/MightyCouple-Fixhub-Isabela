import { CheckCircle2, Copy, ReceiptText, SearchCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../api/client";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { buildTrackOrderUrl, copyText, getOrderReference } from "../../utils/orders";
import { printOrderReceipt } from "../../utils/receipt";

export default function OrderSuccessPage() {
  const location = useLocation();
  const { orderReference } = useParams();
  const { settings } = useStoreSettings();
  const [order, setOrder] = useState(() => {
    const stateOrder = location.state?.order;
    return getOrderReference(stateOrder) === orderReference ? stateOrder : null;
  });
  const [paymentMessage] = useState(location.state?.paymentMessage || "");
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (order) {
      return;
    }

    async function loadOrder() {
      try {
        const { data } = await api.get(`/orders/reference/${orderReference}`);
        setOrder(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load the order confirmation.");
      }
    }

    loadOrder();
  }, [order, orderReference]);

  const trackHref = useMemo(
    () => buildTrackOrderUrl(orderReference || getOrderReference(order), order?.shippingAddress?.email || ""),
    [order, orderReference]
  );

  async function handleCopyOrderId() {
    const copied = await copyText(getOrderReference(order) || orderReference);
    setCopyStatus(copied ? "Order ID copied." : "Unable to copy the Order ID.");
  }

  function handlePrintReceipt() {
    if (!order) {
      return;
    }

    printOrderReceipt(order, settings.storeName);
  }

  if (!order && !error) {
    return <LoadingScreen label="Loading your order confirmation..." />;
  }

  return (
    <div className="page-shell py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <section className="glass-panel rounded-[36px] p-6 shadow-ambient sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                <CheckCircle2 size={16} />
                Checkout complete
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Your order has been placed successfully</h1>
              <p className="mt-3 text-slate-300">
                Save this Order ID so you can track the shipment, payment progress, and delivery updates any time.
              </p>
            </div>
            <OrderStatusBadge status={order?.trackingStatus || order?.status || "pending"} />
          </div>

          {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

          {order && (
            <div className="mt-6 space-y-6">
              <div className="rounded-[32px] border border-brand-400/20 bg-gradient-to-r from-brand-500/15 via-cyan-400/10 to-transparent p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-brand-100/80">Order confirmation</p>
                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Order ID</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[0.12em] text-white">{getOrderReference(order)}</p>
                    <p className="mt-2 text-sm text-slate-300">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10"
                    >
                      <Copy size={16} className="mr-2" />
                      Copy Order ID
                    </button>
                    <Link
                      to={trackHref}
                      className="inline-flex items-center rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      <SearchCheck size={16} className="mr-2" />
                      Track this order
                    </Link>
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/15"
                    >
                      <ReceiptText size={16} className="mr-2" />
                      Print receipt
                    </button>
                  </div>
                </div>
                {copyStatus && <p className="mt-4 text-sm text-brand-50">{copyStatus}</p>}
              </div>

              {paymentMessage && (
                <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  {paymentMessage}
                </div>
              )}

              {order.orderType === "installment" ? (
                <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                  This purchase uses the installment plan. Submit your down payment and future proofs from the My Installments page.
                  Payments made are non-refundable under the installment agreement.
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Customer</p>
                  <p className="mt-3 font-semibold text-white">{order.shippingAddress?.fullName}</p>
                  <p className="mt-1 text-sm text-slate-300">{order.shippingAddress?.email}</p>
                  <p className="mt-1 text-sm text-slate-300">{order.shippingAddress?.phone}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Shipping address</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {order.shippingAddress?.line1}
                    <br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.province}
                    <br />
                    {order.shippingAddress?.postalCode} {order.shippingAddress?.country}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Payment and total</p>
                  <p className="mt-3 font-semibold capitalize text-white">{String(order.payment?.method || "").replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-300">Payment status: {order.payment?.status}</p>
                  <p className="mt-4 text-2xl font-semibold text-brand-50">{peso(order.pricing?.total)}</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                  <ReceiptText size={16} className="text-cyan-300" />
                  Items in this order
                </div>
                <div className="mt-5 space-y-3">
                  {order.items.map((item) => (
                    <div key={`${item.name}-${item.variantId || "default"}`} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Qty {item.quantity}
                          {item.variantLabel ? ` | ${item.variantLabel}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-100">{peso(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="glass-panel h-fit rounded-[36px] p-6 shadow-ambient">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">What to do next</p>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              Keep your <span className="font-semibold text-white">Order ID</span> saved or copied somewhere safe.
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              Use the <span className="font-semibold text-white">Track Order</span> page any time to check status changes.
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              If your payment method needs proof, upload it from the tracking page using this same order.
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link to={order?.orderType === "installment" ? "/installments" : "/orders"} className="rounded-2xl bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:-translate-y-0.5">
              {order?.orderType === "installment" ? "Open My Installments" : "View all my orders"}
            </Link>
            <Link to="/" className="rounded-2xl border border-white/10 px-5 py-3 text-center text-slate-100 transition hover:bg-white/5">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
