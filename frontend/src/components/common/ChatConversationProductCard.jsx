import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, PackageSearch, ShoppingBag } from "lucide-react";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";

export default function ChatConversationProductCard({
  product = null,
  order = null,
  repairRequest = null,
  compact = false,
  participantLabel = "",
  actionLabel = "",
  actionTo = ""
}) {
  const isRepairContext = Boolean(repairRequest);
  const isOrderContext = !isRepairContext && Boolean(order);
  const repairTitle = [repairRequest?.device?.brand, repairRequest?.device?.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cardTitle = isRepairContext
    ? repairTitle || repairRequest?.device?.type || repairRequest?.requestNumber || "Repair request"
    : isOrderContext
      ? (order.orderNumber || order.itemName || "Order chat")
      : (product?.name || "Product inquiry");
  const imageUrl = resolveMediaUrl(
    isRepairContext
      ? (repairRequest?.image || "")
      : isOrderContext
        ? (order?.image || "")
        : (product?.image || "")
  );
  const cardMeta = isRepairContext
    ? `${repairRequest?.requestNumber || "Repair request"}${repairRequest?.issueDescription ? ` | ${repairRequest.issueDescription}` : ""}`
    : isOrderContext
      ? `${order?.itemName || "Order item"}${order?.itemCount ? ` | ${order.itemCount} item(s)` : ""}`
      : participantLabel;
  const priceLabel = isRepairContext
    ? peso(repairRequest?.total || 0)
    : isOrderContext
      ? peso(order?.total || 0)
      : peso(product?.price || 0);
  const badgeLabel = isRepairContext ? "Repair in discussion" : isOrderContext ? "Order in discussion" : "Product in discussion";
  const actionHref = actionTo
    || (isRepairContext
      ? `/repairs?repair=${repairRequest?._id || ""}`
      : !isOrderContext && product?.slug
        ? `/product/${product.slug}`
        : "");
  const actionCopy = actionLabel || (isRepairContext ? "Open repair" : isOrderContext ? "Open order" : "Open product");

  if (!product && !order && !repairRequest) {
    return null;
  }

  return (
    <div className={`rounded-[24px] border border-white/10 bg-white/5 ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex ${compact ? "items-center gap-3" : "items-start gap-4"}`}>
        <div className={`overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/40 ${compact ? "h-14 w-14" : "h-20 w-20"}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={cardTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              {isRepairContext ? <MessageSquare size={18} /> : isOrderContext ? <ShoppingBag size={18} /> : <PackageSearch size={18} />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-100">
              <MessageSquare size={12} />
              {badgeLabel}
            </span>
            {isOrderContext ? (
              <span className="rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 text-[11px] text-slate-300">
                {String(order?.status || "pending").replaceAll("_", " ")}
              </span>
            ) : isRepairContext ? (
              <span className="rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 text-[11px] text-slate-300">
                {String(repairRequest?.status || "pending").replaceAll("_", " ")}
              </span>
            ) : product?.category ? (
              <span className="rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 text-[11px] text-slate-300">
                {product.category}
              </span>
            ) : null}
          </div>

          <p className={`mt-2 font-semibold text-white ${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-base"}`}>
            {cardTitle}
          </p>

          <div className={`mt-2 flex ${compact ? "flex-col gap-1" : "flex-wrap items-center gap-3"} text-xs text-slate-400`}>
            <span className="font-semibold text-brand-100">{priceLabel}</span>
            {cardMeta ? <span className="line-clamp-2">{cardMeta}</span> : null}
          </div>
        </div>

        {actionHref ? (
          <Link
            to={actionHref}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white transition hover:bg-white/10 ${compact ? "h-10" : "h-11"}`}
          >
            {!compact ? <span>{actionCopy}</span> : null}
            <ArrowRight size={15} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
