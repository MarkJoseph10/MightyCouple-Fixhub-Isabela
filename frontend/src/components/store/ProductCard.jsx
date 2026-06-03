import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AccessPromptModal from "../common/AccessPromptModal";
import TiltCard from "../common/TiltCard";
import { useWishlist } from "../../context/WishlistContext";
import { formatCompactCount, peso } from "../../utils/commerce";
import { optimizeImageUrl } from "../../utils/media";

export default function ProductCard({ product, onAddToCart, compact = false, eagerImage = false }) {
  const location = useLocation();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [accessPromptMessage, setAccessPromptMessage] = useState("");
  const isNativeApp = Capacitor.isNativePlatform();
  const nativeCompact = isNativeApp && compact;
  const wished = isWishlisted(product._id);
  const availableStock = Number(product.stock || 0);
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const descriptionStyle = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden"
  };
  const titleClampStyle = compact
    ? {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: nativeCompact ? 2 : 2,
        overflow: "hidden"
      }
    : undefined;

  async function handleWishlistClick() {
    const result = await toggleWishlist(product._id);

    if (result?.requiresAuth) {
      setAccessPromptMessage("Please log in to save items to your wishlist.");
    }
  }

  return (
    <>
      <TiltCard className="h-full">
        <motion.article
          whileHover={{ y: -4 }}
          className={`group glass-panel flex h-full flex-col overflow-hidden shadow-ambient transition duration-300 hover:shadow-[0_24px_72px_rgba(37,99,235,0.18)] ${
            nativeCompact ? "rounded-[18px]" : "rounded-[26px]"
          }`}
        >
          <div
            className={`relative flex items-center justify-center overflow-hidden bg-slate-950/30 ${
              nativeCompact
                ? "aspect-square h-auto min-h-[76px]"
                : compact
                  ? "h-[158px] sm:h-[170px]"
                  : "h-[188px] sm:h-[200px]"
            }`}
          >
            <Link
              to={`/product/${product.slug}`}
              aria-label={`Open ${product.name}`}
              className="absolute inset-0 z-[1]"
            />
            <img
              src={optimizeImageUrl(product.images?.[0]?.url, {
                width: nativeCompact ? 320 : compact ? 480 : 560,
                height: nativeCompact ? 320 : compact ? 336 : 400,
                fit: "limit"
              })}
              alt={product.images?.[0]?.alt || product.name}
              loading={eagerImage ? "eager" : "lazy"}
              fetchpriority={eagerImage ? "high" : "auto"}
              className="h-full w-full object-scale-down transition duration-500 group-hover:scale-[1.03]"
            />
            <div className={`absolute flex flex-wrap gap-2 ${nativeCompact ? "left-2 top-2" : "left-4 top-4"}`}>
              <div
                className={`rounded-full bg-slate-950/70 font-semibold text-white ${
                  nativeCompact ? "px-1.5 py-0.5 text-[8px]" : "px-3 py-1 text-xs"
                }`}
              >
                {product.category}
              </div>
              {!availableStock ? (
                <div className={`rounded-full bg-rose-500/85 font-semibold text-white ${nativeCompact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs"}`}>
                  Sold out
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleWishlistClick}
              aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
              className={`absolute right-4 top-4 rounded-full p-2 backdrop-blur transition duration-300 ${
                wished ? "bg-rose-500 text-white" : "bg-slate-950/70 text-slate-100 hover:bg-white/20"
              } ${nativeCompact ? "right-2 top-2 p-1.5" : ""} z-[2]`}
            >
              <Heart size={nativeCompact ? 13 : 16} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>
          <div className={`flex flex-1 flex-col ${nativeCompact ? "gap-1 p-1.5" : compact ? "gap-2 p-3" : "gap-3 p-3.5"}`}>
            <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-4"} sm:flex-row sm:items-start sm:justify-between`}>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${product.slug}`}>
                  <h3
                    className={`break-words font-semibold leading-snug text-white ${
                      nativeCompact
                        ? "min-h-[2rem] text-[0.68rem]"
                        : compact
                          ? "min-h-[2.4rem] text-[0.95rem]"
                          : "min-h-[2.6rem] text-[1rem]"
                    }`}
                    style={titleClampStyle}
                  >
                    {product.name}
                  </h3>
                </Link>
                {!compact ? (
                  <p className="mt-1.5 text-sm leading-5 text-slate-300" style={descriptionStyle}>
                    {product.shortDescription}
                  </p>
                ) : null}
                {!compact ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      {product.condition || "Affordable tech"}
                    </span>
                    {product.hasVariants && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        Multiple variants
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              <div className={`flex shrink-0 flex-col items-start text-left sm:items-end sm:text-right ${nativeCompact ? "mt-1" : compact ? "mt-0.5" : ""}`}>
                {product.compareAtPrice > product.price && (
                  <p className={`text-slate-500 line-through ${nativeCompact ? "text-[9px]" : "text-xs"}`}>{peso(product.compareAtPrice)}</p>
                )}
                <strong className={`text-brand-50 ${nativeCompact ? "text-[0.78rem]" : compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>{peso(product.priceFrom || product.price)}</strong>
                {!compact && isLowStock ? <span className="mt-1 text-xs font-medium text-amber-200">Low stock</span> : null}
              </div>
            </div>
            {nativeCompact ? (
              <div className="mt-auto flex items-center justify-between gap-2 rounded-[14px] border border-white/10 bg-white/5 px-2 py-1.5 text-[9px] text-slate-200">
                <span className="inline-flex min-w-0 items-center gap-1 truncate">
                  <Users size={10} className="shrink-0 text-orange-300" />
                  {formatCompactCount(product.soldCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star size={10} className="text-amber-300" />
                  {Number(product.rating || 0).toFixed(1)}
                </span>
              </div>
            ) : (
              <div
                className={`grid gap-2 rounded-[22px] border border-white/10 bg-white/5 text-xs text-slate-200 ${
                  compact ? "grid-cols-2 p-2" : "grid-cols-2 p-2.5 sm:grid-cols-3"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2">
                  <Users size={14} className="text-orange-300" />
                  <span>{formatCompactCount(product.soldCount)} sold</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2">
                  <Star size={14} className="text-amber-300" />
                  <span>{Number(product.rating || 0).toFixed(1)}</span>
                </div>
                {!compact ? (
                  <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2 sm:col-span-1">
                    <TrendingUp size={14} className="text-cyan-300" />
                    <span>{formatCompactCount(product.recentSales24h)} today</span>
                  </div>
                ) : null}
              </div>
            )}
            {!nativeCompact ? (
              <div className="mt-auto flex items-center gap-2">
                <Link
                  to={`/product/${product.slug}`}
                  title="View product details"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white/10 ${compact ? "min-h-[42px] py-2.5" : "min-h-[46px] py-3"}`}
                >
                  <span>View product</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <Link
                to={`/product/${product.slug}`}
                title="View product details"
                className="mt-auto inline-flex min-h-[32px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-100 transition duration-300 hover:border-brand-500/40 hover:bg-white/10"
              >
                Open
              </Link>
            )}
          </div>
        </motion.article>
      </TiltCard>
      <AccessPromptModal
        open={Boolean(accessPromptMessage)}
        onClose={() => setAccessPromptMessage("")}
        returnTo={`${location.pathname}${location.search}`}
        message={accessPromptMessage}
      />
    </>
  );
}
