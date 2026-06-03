import { Copy, ReceiptText, RotateCcw, SearchCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import InstallmentCompletionSnapshot from "../../components/common/InstallmentCompletionSnapshot";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import OrderTimeline from "../../components/common/OrderTimeline";
import RefundRequestModal from "../../components/store/RefundRequestModal";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";
import { buildTrackOrderUrl, copyText, formatRefundReason, getOrderReference, getOrderTrackingSteps } from "../../utils/orders";
import { printOrderReceipt } from "../../utils/receipt";
import { getSiteUrl } from "../../utils/site";

export default function TrackOrderPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { settings } = useStoreSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofStatus, setProofStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const trackingSteps = getOrderTrackingSteps(order);

  async function handleTrack(event) {
    event?.preventDefault();
    setError("");
    setCopyStatus("");

    try {
      const { data } = await api.get(`/orders/track/${orderId}`, {
        params: {
          email
        }
      });
      setOrder(data);
      setSearchParams(email ? { orderId, email } : { orderId });
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

  async function handleCopyOrderId() {
    const copied = await copyText(getOrderReference(order));
    setCopyStatus(copied ? "Order ID copied." : "Unable to copy the Order ID.");
  }

  useEffect(() => {
    if (orderId) {
      handleTrack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefundSubmitted(updatedOrder, message) {
    setOrder(updatedOrder);
    setCopyStatus(message || "Refund request submitted.");
    setRefundModalOpen(false);
  }

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMetaElement = document.querySelector('meta[name="description"]');
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    const ogUrlElement = document.querySelector('meta[property="og:url"]');
    const previousDescription = descriptionMetaElement?.getAttribute("content");
    const previousCanonical = canonicalElement?.getAttribute("href");
    const previousOgUrl = ogUrlElement?.getAttribute("content");
    document.title = "Track Order | Mighty Couple";

    const activeDescriptionMeta = descriptionMetaElement || document.createElement("meta");
    const activeCanonicalElement = canonicalElement || document.createElement("link");
    const activeOgUrlElement = ogUrlElement || document.createElement("meta");
    const canonicalUrl = getSiteUrl(window.location.pathname + window.location.search);
    if (!descriptionMetaElement) {
      activeDescriptionMeta.setAttribute("name", "description");
      document.head.appendChild(activeDescriptionMeta);
    }

    activeDescriptionMeta.setAttribute("content", "Track your Mighty Couple order status, payment proof, shipping progress, and delivery timeline.");

    if (!canonicalElement) {
      activeCanonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(activeCanonicalElement);
    }
    activeCanonicalElement.setAttribute("href", canonicalUrl);

    if (!ogUrlElement) {
      activeOgUrlElement.setAttribute("property", "og:url");
      document.head.appendChild(activeOgUrlElement);
    }
    activeOgUrlElement.setAttribute("content", canonicalUrl);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) {
        activeDescriptionMeta.setAttribute("content", previousDescription);
      } else if (!descriptionMetaElement) {
        activeDescriptionMeta.remove();
      }

      if (previousCanonical !== null && previousCanonical !== undefined) {
        activeCanonicalElement.setAttribute("href", previousCanonical);
      } else if (!canonicalElement) {
        activeCanonicalElement.remove();
      }

      if (previousOgUrl !== null && previousOgUrl !== undefined) {
        activeOgUrlElement.setAttribute("content", previousOgUrl);
      } else if (!ogUrlElement) {
        activeOgUrlElement.remove();
      }
    };
  }, []);

  return (
    <>
    <div className="page-shell py-6 sm:py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={handleTrack} className="glass-panel rounded-[28px] p-5 shadow-ambient sm:rounded-[32px] sm:p-6">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Track an order</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your Order ID to see the latest payment, fulfillment, and delivery updates.</p>
          <div className="mt-6 space-y-4">
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Order ID"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <details className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <summary className="cursor-pointer list-none font-medium text-white">Guest lookup support</summary>
              <p className="mt-3 text-sm text-slate-400">
                If you are not logged in, add the checkout email below so guest tracking can still find the order.
              </p>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email used at checkout"
                className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
            </details>
          </div>
          {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
          <button className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 sm:w-auto">
            <SearchCheck size={16} className="mr-2" />
            Track order
          </button>
        </form>

        <section className="glass-panel rounded-[28px] p-5 shadow-ambient sm:rounded-[32px] sm:p-6">
          <h2 className="text-2xl font-semibold text-white">Order status</h2>
          {!order && !error && <p className="mt-4 text-slate-300">Enter your order ID to see the latest status.</p>}

          {order && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Order ID</p>
                  <p className="mt-2 break-all text-lg font-semibold tracking-[0.06em] text-white sm:text-xl">{getOrderReference(order)}</p>
                  <p className="text-sm text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.trackingStatus || order.status} />
                  <OrderStatusBadge status={order.status} />
                  {order.refundRequest?.status ? <OrderStatusBadge status={order.refundRequest.status} /> : null}
                </div>
              </div>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/5 sm:w-auto"
                >
                  <Copy size={15} className="mr-2" />
                  Copy Order ID
                </button>
                <button
                  type="button"
                  onClick={() => copyText(`${window.location.origin}${buildTrackOrderUrl(getOrderReference(order), order.shippingAddress?.email || email || "")}`).then((copied) => setCopyStatus(copied ? "Tracking link copied." : "Unable to copy the tracking link."))}
                  className="inline-flex w-full items-center justify-center rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-50 transition hover:bg-brand-500/15 sm:w-auto"
                >
                  <Copy size={15} className="mr-2" />
                  Copy tracking link
                </button>
                <button
                  type="button"
                  onClick={() => printOrderReceipt(order, settings.storeName)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-500/15 sm:w-auto"
                >
                  <ReceiptText size={15} className="mr-2" />
                  Print receipt
                </button>
                {order.refundEligibility?.canRequest && isAuthenticated && !isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setRefundModalOpen(true)}
                    className="inline-flex w-full items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15 sm:w-auto"
                  >
                    <RotateCcw size={15} className="mr-2" />
                    Request refund
                  </button>
                ) : null}
              </div>
              {copyStatus && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{copyStatus}</div>}
              {order.orderType === "installment" ? (
                <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-5 text-sm text-cyan-50">
                  This is an installment transaction. Refund requests stay disabled because payments made are non-refundable under the installment agreement.
                </div>
              ) : null}
              {order.orderType === "installment" ? <InstallmentCompletionSnapshot order={order} /> : null}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Tracking summary</p>
                  <p className="mt-3 font-semibold capitalize text-white">{String(order.trackingStatus || order.status).replaceAll("_", " ")}</p>
                  <p className="mt-2 text-sm text-slate-300">{order.items?.length || 0} item(s) in this order</p>
                  <p className="mt-2 text-sm text-slate-300">Total: {peso(order.pricing?.total)}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Shipping</p>
                  <p className="mt-3 font-semibold text-white">{order.shippingAddress?.fullName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {order.shippingAddress?.line1}, {order.shippingAddress?.city}, {order.shippingAddress?.province}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Payment</p>
                  <p className="mt-3 font-semibold capitalize text-white">{String(order.payment?.method || "").replace("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-300">{order.payment?.instructions || "Awaiting update"}</p>
                  {order.payment?.proofImage && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Uploaded proof</p>
                      <img
                        src={resolveMediaUrl(order.payment.proofImage)}
                        alt="Payment proof"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {order.refundRequest?.status ? (
                <div className="rounded-[28px] border border-sky-400/15 bg-sky-500/10 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Refund status</p>
                    <OrderStatusBadge status={order.refundRequest.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-100">Reason: {formatRefundReason(order.refundRequest.reason)}</p>
                  {order.refundRequest.message ? <p className="mt-2 text-sm text-slate-300">{order.refundRequest.message}</p> : null}
                  {order.refundRequest.adminMessage ? <p className="mt-2 text-sm text-slate-300">Admin update: {order.refundRequest.adminMessage}</p> : null}
                  {order.refundRequest.proofImage ? (
                    <img
                      src={resolveMediaUrl(order.refundRequest.proofImage)}
                      alt="Refund proof"
                      className="mt-4 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
              ) : !order.refundEligibility?.canRequest && order.refundEligibility?.reason ? (
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                  {order.refundEligibility.reason}
                </div>
              ) : order.refundEligibility?.canRequest && (!isAuthenticated || isAdmin) ? (
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                  {isAdmin ? "Refund requests are only available from the customer side." : "Log in to request a refund for this order."}
                </div>
              ) : null}

              {order.orderType !== "installment" && ["gcash", "bank_transfer"].includes(order.payment?.method) && order.payment?.status === "pending" && (
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

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Tracking workflow</p>
                <div className="mt-4">
                  <OrderTimeline steps={trackingSteps} />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Timeline history</p>
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

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
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
    <RefundRequestModal
      open={refundModalOpen}
      order={order}
      onClose={() => setRefundModalOpen(false)}
      onSubmitted={handleRefundSubmitted}
    />
    </>
  );
}
