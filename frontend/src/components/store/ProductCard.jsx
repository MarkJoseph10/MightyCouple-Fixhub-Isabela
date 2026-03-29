import { motion } from "framer-motion";
import { ArrowRight, Heart, ShoppingBag, Star, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AccessPromptModal from "../common/AccessPromptModal";
import TiltCard from "../common/TiltCard";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { peso } from "../../utils/commerce";

export default function ProductCard({ product, onAddToCart }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [accessPromptMessage, setAccessPromptMessage] = useState("");
  const wished = isWishlisted(product._id);
  const availableStock = Number(product.stock || 0);

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
      <TiltCard>
        <motion.article
          whileHover={{ y: -4 }}
          className="glass-panel overflow-hidden rounded-[28px] shadow-ambient transition duration-300 hover:shadow-[0_30px_80px_rgba(37,99,235,0.18)]"
        >
          <div className="relative h-64 overflow-hidden">
            <img
              src={product.images?.[0]?.url}
              alt={product.images?.[0]?.alt || product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <div className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white">
                {product.category}
              </div>
              <div className="rounded-full bg-orange-500/80 px-3 py-1 text-xs font-semibold text-white">
                {product.popularityLabel || "Trending"}
              </div>
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
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{product.shortDescription}</p>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="text-right">
                {product.compareAtPrice > product.price && (
                  <p className="text-xs text-slate-500 line-through">{peso(product.compareAtPrice)}</p>
                )}
                <strong className="text-brand-50">{peso(product.priceFrom || product.price)}</strong>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-orange-300" />
                <span>{product.soldCount || 0} sold</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={14} className="text-amber-300" />
                <span>{Number(product.rating || 0).toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-300" />
                <span>{product.recentSales24h || 0} today</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddClick}
                disabled={!availableStock}
                title={!isAuthenticated ? "Please log in to add items to your cart." : ""}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag size={16} className="mr-2" />
                {availableStock ? (isAuthenticated ? "Add to cart" : "Log in to add") : "Sold out"}
              </button>
              <Link
                to={`/product/${product.slug}`}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-100 transition duration-300 hover:border-brand-500/40 hover:bg-white/5"
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
