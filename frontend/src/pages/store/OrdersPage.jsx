import { Copy, ReceiptText, RotateCcw, SearchCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import InstallmentCompletionSnapshot from "../../components/common/InstallmentCompletionSnapshot";
import OrderTimeline from "../../components/common/OrderTimeline";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import RefundRequestModal from "../../components/store/RefundRequestModal";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";
import { buildTrackOrderUrl, copyText, formatRefundReason, getOrderReference, getOrderTrackingSteps } from "../../utils/orders";
import { printOrderReceipt } from "../../utils/receipt";

export default function OrdersPage() {
  const { isAdmin } = useAuth();
  const { settings } = useStoreSettings();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [refundMessage, setRefundMessage] = useState("");
  const [refundOrder, setRefundOrder] = useState(null);

  async function loadOrders() {
    try {
      const { data } = await api.get("/orders/mine");
      setOrders(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load orders.");
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (!orders && !error) {
    return <LoadingScreen label="Loading your orders..." />;
  }

  async function handleCopyOrderId(order) {
    const copied = await copyText(getOrderReference(order));
    setCopyStatus(copied ? `Copied ${getOrderReference(order)}` : "Unable to copy the Order ID.");
  }

  function handleRefundSubmitted(updatedOrder, message) {
    setRefundMessage(message || "Refund request submitted.");
    setOrders((current) =>
      (current || []).map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
    );
    setRefundOrder(null);
  }

  return (
    <>
    <div className="page-shell py-10">
      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-semibold text-white">My orders</h1>
          <Link
            to="/installments"
            className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-50 transition duration-300 hover:bg-cyan-500/15"
          >
            Open My Installments
          </Link>
        </div>
        {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        {copyStatus && <div className="mt-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{copyStatus}</div>}
        {refundMessage && <div className="mt-6 rounded-2xl bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{refundMessage}</div>}

        <div className="mt-6 space-y-4">
          {orders?.filter((order) => order.orderType !== "installment").map((order) => (
            <div key={order._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Order ID</p>
                  <p className="mt-2 font-semibold tracking-[0.08em] text-white">{getOrderReference(order)}</p>
                  <p className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.trackingStatus || order.status} />
                  <OrderStatusBadge status={order.status} />
                  {order.refundRequest?.status ? <OrderStatusBadge status={order.refundRequest.status} /> : null}
                </div>
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
                  <p>Tracking: {String(order.trackingStatus || order.status).replaceAll("_", " ")}</p>
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
              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Shipping workflow</p>
                <div className="mt-4">
                  <OrderTimeline steps={getOrderTrackingSteps(order)} compact />
                </div>
              </div>
              {order.orderType === "installment" ? <div className="mt-4"><InstallmentCompletionSnapshot order={order} /></div> : null}
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
              {order.refundRequest?.status ? (
                <div className="mt-4 rounded-[24px] border border-sky-400/15 bg-sky-500/10 p-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.28em] text-slate-300">Refund status</span>
                    <OrderStatusBadge status={order.refundRequest.status} />
                  </div>
                  <p className="mt-3">Reason: {formatRefundReason(order.refundRequest.reason)}</p>
                  {order.refundRequest.message ? <p className="mt-2 text-slate-300">{order.refundRequest.message}</p> : null}
                  {order.refundRequest.adminMessage ? (
                    <p className="mt-2 text-slate-300">Admin update: {order.refundRequest.adminMessage}</p>
                  ) : null}
                  {order.refundRequest.proofImage ? (
                    <img
                      src={resolveMediaUrl(order.refundRequest.proofImage)}
                      alt="Refund proof"
                      className="mt-4 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopyOrderId(order)}
                    className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition duration-300 hover:bg-white/5"
                  >
                    <Copy size={15} className="mr-2" />
                    Copy Order ID
                  </button>
                  <Link
                    to={buildTrackOrderUrl(getOrderReference(order), order.shippingAddress?.email || "")}
                    className="inline-flex items-center rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-50 transition duration-300 hover:bg-brand-500/15"
                  >
                    <SearchCheck size={15} className="mr-2" />
                    Track order
                  </Link>
                  <button
                    type="button"
                    onClick={() => printOrderReceipt(order, settings.storeName)}
                    className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-50 transition duration-300 hover:bg-cyan-500/15"
                  >
                    <ReceiptText size={15} className="mr-2" />
                    Print receipt
                  </button>
                  {order.refundEligibility?.canRequest && !isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setRefundOrder(order)}
                      className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 transition duration-300 hover:bg-amber-500/15"
                    >
                      <RotateCcw size={15} className="mr-2" />
                      Request refund
                    </button>
                  ) : null}
                </div>
                {!order.refundEligibility?.canRequest && !order.refundRequest?.status && order.refundEligibility?.reason ? (
                  <p className="mt-3 text-sm text-slate-500">{order.refundEligibility.reason}</p>
                ) : null}
              </div>
            </div>
          ))}
          {!orders?.filter((order) => order.orderType !== "installment").length && !error && (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">
              You do not have any orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
    <RefundRequestModal
      open={Boolean(refundOrder)}
      order={refundOrder}
      onClose={() => setRefundOrder(null)}
      onSubmitted={handleRefundSubmitted}
    />
    </>
  );
}
