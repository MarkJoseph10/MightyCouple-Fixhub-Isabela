import { motion } from "framer-motion";
import { ArrowRight, Heart, ShoppingBag, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AccessPromptModal from "../common/AccessPromptModal";
import TiltCard from "../common/TiltCard";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { peso } from "../../utils/commerce";
import { optimizeImageUrl } from "../../utils/media";

export default function ProductCard({ product, onAddToCart, compact = false, eagerImage = false }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [accessPromptMessage, setAccessPromptMessage] = useState("");
  const wished = isWishlisted(product._id);
  const availableStock = Number(product.stock || 0);
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const descriptionStyle = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden"
  };

  async function handleWishlistClick() {
    const result = await toggleWishlist(product._id);

    if (result?.requiresAuth) {
      setAccessPromptMessage("Please log in to save items to your wishlist.");
    }
  }

  async function handleAddClick() {
    if (!availableStock) {
      return;
    }

    if (!isAuthenticated) {
      setAccessPromptMessage("Please log in to add items to your cart.");
      return;
    }

    await onAddToCart(product);
  }

  return (
    <>
      <TiltCard className="h-full">
        <motion.article
          whileHover={{ y: -4 }}
          className="group glass-panel flex h-full flex-col overflow-hidden rounded-[26px] shadow-ambient transition duration-300 hover:shadow-[0_24px_72px_rgba(37,99,235,0.18)]"
        >
          <div className={`relative flex items-center justify-center overflow-hidden bg-slate-950/30 ${compact ? "h-[142px] sm:h-[154px]" : "h-[188px] sm:h-[200px]"}`}>
            <img
              src={optimizeImageUrl(product.images?.[0]?.url, {
                width: compact ? 480 : 560,
                height: compact ? 336 : 400,
                fit: "limit"
              })}
              alt={product.images?.[0]?.alt || product.name}
              loading={eagerImage ? "eager" : "lazy"}
              fetchpriority={eagerImage ? "high" : "auto"}
              className="h-full w-full object-scale-down transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <div className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">
                {product.category}
              </div>
              <div className="rounded-full bg-orange-500/80 px-3 py-1 text-xs font-semibold text-white">
                {product.popularityLabel || "Trending"}
              </div>
              {!availableStock ? (
                <div className="rounded-full bg-rose-500/85 px-3 py-1 text-xs font-semibold text-white">
                  Sold out
                </div>
              ) : null}
              {isLowStock ? (
                <div className="rounded-full bg-amber-500/85 px-3 py-1 text-xs font-semibold text-slate-950">
                  Only {availableStock} left
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleWishlistClick}
              className={`absolute right-4 top-4 rounded-full p-2 backdrop-blur transition duration-300 ${
                wished ? "bg-rose-500 text-white" : "bg-slate-950/70 text-slate-100 hover:bg-white/20"
              }`}
            >
              <Heart size={16} fill={wished ? "currentColor" : "none"} />
            </button>
          </div>
          <div className={`flex flex-1 flex-col ${compact ? "gap-2.5 p-3" : "gap-3 p-3.5"}`}>
            <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"} sm:flex-row sm:items-start sm:justify-between`}>
              <div className="min-w-0 flex-1">
                <h3 className={`break-words font-semibold leading-snug text-white ${compact ? "min-h-[2.5rem] text-[0.95rem]" : "min-h-[2.6rem] text-[1rem]"}`}>
                  {product.name}
                </h3>
                {!compact ? (
                  <p className="mt-1.5 text-sm leading-5 text-slate-300" style={descriptionStyle}>
                    {product.shortDescription}
                  </p>
                ) : null}
                <div className={`mt-2.5 flex flex-wrap gap-2 ${compact ? "text-[0.68rem]" : ""}`}>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    {product.condition || "Affordable tech"}
                  </span>
                  {product.hasVariants && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      Multiple variants
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start text-left sm:items-end sm:text-right">
                {product.compareAtPrice > product.price && (
                  <p className="text-xs text-slate-500 line-through">{peso(product.compareAtPrice)}</p>
                )}
                <strong className={`text-brand-50 ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>{peso(product.priceFrom || product.price)}</strong>
                {isLowStock ? <span className="mt-1 text-xs font-medium text-amber-200">Low stock</span> : null}
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/5 text-xs text-slate-200 sm:grid-cols-3 ${compact ? "p-2" : "p-2.5"}`}>
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2">
                <Users size={14} className="text-orange-300" />
                <span>{product.soldCount || 0} sold</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2">
                <Star size={14} className="text-amber-300" />
                <span>{Number(product.rating || 0).toFixed(1)}</span>
              </div>
              <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-2xl bg-slate-950/20 px-3 py-2 sm:col-span-1">
                <TrendingUp size={14} className="text-cyan-300" />
                <span>{product.recentSales24h || 0} today</span>
              </div>
            </div>
            <div className="mt-auto flex items-center gap-2.5">
              <button
                onClick={handleAddClick}
                disabled={!availableStock}
                title={!isAuthenticated ? "Please log in to add items to your cart." : ""}
                className={`inline-flex flex-1 items-center justify-center rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? "min-h-[42px] py-2.5" : "min-h-[46px] py-3"}`}
              >
                <ShoppingBag size={16} className="mr-2" />
                {availableStock ? (isAuthenticated ? "Add to cart" : "Log in to add") : "Sold out"}
              </button>
              <Link
                to={`/product/${product.slug}`}
                className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 text-sm text-slate-100 transition duration-300 hover:border-brand-500/40 hover:bg-white/5 ${compact ? "h-[42px] w-[42px]" : "h-[46px] w-[46px]"}`}
              >
                <ArrowRight size={16} />
              </Link>
            </div>
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
