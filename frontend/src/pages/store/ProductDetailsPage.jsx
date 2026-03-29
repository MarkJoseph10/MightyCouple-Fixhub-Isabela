import { Heart, MessageSquare, ShieldCheck, ShoppingBag, Star, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../api/client";
import AccessPromptModal from "../../components/common/AccessPromptModal";
import LoadingScreen from "../../components/common/LoadingScreen";
import ProductCard from "../../components/store/ProductCard";
import CountdownTimer from "../../components/store/CountdownTimer";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";
import { peso } from "../../utils/commerce";
import { pushRecentlyViewed } from "../../utils/recentlyViewed";

const initialReviewForm = {
  rating: 5,
  comment: ""
};

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { settings } = useStoreSettings();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [reviewStatus, setReviewStatus] = useState("");
  const [error, setError] = useState("");
  const [accessPromptMessage, setAccessPromptMessage] = useState("");

  async function loadReviews(productId) {
    const { data } = await api.get(`/reviews/${productId}`);
    setReviews(data);
  }

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data } = await api.get(`/products/${slug}`);
        setProduct(data);
        setSelectedVariantId(String(data.variants?.find((variant) => variant.isDefault)?._id || data.variants?.[0]?._id || ""));
        pushRecentlyViewed(data);
        setError("");
        await loadReviews(data._id);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Product not found.");
      }
    }

    loadProduct();
  }, [slug]);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    document.title = `${product.name} | ${settings.storeName}`;

    let descriptionMeta = document.querySelector('meta[name="description"]');

    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.appendChild(descriptionMeta);
    }

    descriptionMeta.setAttribute("content", product.shortDescription || product.description);

    return () => {
      document.title = settings.storeName;
    };
  }, [product, settings.storeName]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => String(variant._id) === String(selectedVariantId)) || null,
    [product, selectedVariantId]
  );

  const activePrice = Number(selectedVariant?.price || product?.price || 0);
  const activeStock = Number(selectedVariant?.stock ?? product?.stock ?? 0);
  const wished = product ? isWishlisted(product._id) : false;
  const limitedOffer = settings.promotions?.limitedOffer;

  async function handleAddToCart() {
    if (!product) {
      return;
    }

    if (!isAuthenticated) {
      setAccessPromptMessage("Please log in to add items to your cart.");
      return;
    }

    await addToCart(product, quantity, { variant: selectedVariant });
    setReviewStatus("Added to cart.");
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();

    if (!product) {
      return;
    }

    try {
      await api.post(`/reviews/${product._id}`, reviewForm);
      setReviewForm(initialReviewForm);
      setReviewStatus("Review added successfully.");
      await Promise.all([
        loadReviews(product._id),
        api.get(`/products/${slug}`).then(({ data }) => setProduct(data))
      ]);
    } catch (requestError) {
      setReviewStatus(requestError.response?.data?.message || "Unable to submit your review.");
    }
  }

  if (error) {
    return (
      <div className="page-shell py-10">
        <div className="glass-panel rounded-[32px] p-8 text-rose-200 shadow-ambient">{error}</div>
      </div>
    );
  }

  if (!product) {
    return <LoadingScreen label="Loading product details..." />;
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-6">
          <div className="glass-panel overflow-hidden rounded-[36px] shadow-ambient">
            <img
              src={product.images?.[0]?.url}
              alt={product.images?.[0]?.alt || product.name}
              className="h-full min-h-[420px] w-full object-cover"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel rounded-[28px] p-5 shadow-ambient">
              <div className="flex items-center gap-3 text-amber-300">
                <Star size={18} />
                <span className="text-sm uppercase tracking-[0.28em] text-slate-400">Average rating</span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{Number(product.rating || 0).toFixed(1)}</p>
              <p className="mt-1 text-sm text-slate-300">{product.reviewCount || 0} review(s)</p>
            </div>
            <div className="glass-panel rounded-[28px] p-5 shadow-ambient">
              <div className="flex items-center gap-3 text-orange-300">
                <Users size={18} />
                <span className="text-sm uppercase tracking-[0.28em] text-slate-400">Buyers</span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{product.soldCount || 0}</p>
              <p className="mt-1 text-sm text-slate-300">Units sold overall</p>
            </div>
            <div className="glass-panel rounded-[28px] p-5 shadow-ambient">
              <div className="flex items-center gap-3 text-cyan-300">
                <TrendingUp size={18} />
                <span className="text-sm uppercase tracking-[0.28em] text-slate-400">Last 24 hours</span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{product.recentSales24h || 0}</p>
              <p className="mt-1 text-sm text-slate-300">Units moved today</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[36px] p-8 shadow-ambient">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
                {product.category}
              </span>
              <span className="rounded-full bg-orange-500/80 px-3 py-1 text-xs font-semibold text-white">
                {product.popularityLabel || "Trending"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                {product.condition || "Affordable tech"}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-semibold text-white">{product.name}</h1>
            <p className="mt-4 text-lg text-slate-300">{product.description}</p>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Price</p>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-semibold text-brand-50">{peso(activePrice)}</p>
                  {product.compareAtPrice > activePrice && (
                    <p className="pb-1 text-sm text-slate-500 line-through">{peso(product.compareAtPrice)}</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">Stock: {activeStock}</div>
            </div>

            {!!product.variants?.length && (
              <div className="mt-6">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Choose variant</p>
                <div className="mt-3 grid gap-3">
                  {product.variants.map((variant) => {
                    const label = [variant.name, variant.color, variant.storage, variant.model].filter(Boolean).join(" | ");

                    return (
                      <button
                        key={variant._id}
                        type="button"
                        onClick={() => setSelectedVariantId(String(variant._id))}
                        className={`rounded-[24px] border px-4 py-4 text-left transition duration-300 ${
                          String(selectedVariantId) === String(variant._id)
                            ? "border-brand-400 bg-brand-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-white">{label || "Default variant"}</p>
                            <p className="mt-1 text-sm text-slate-400">SKU: {variant.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-100">{peso(variant.price || product.price)}</p>
                            <p className="text-sm text-slate-400">{variant.stock} left</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
              {(product.attributes || []).map((attribute) => (
                <div key={attribute.label} className="flex items-center justify-between gap-4 text-sm text-slate-300">
                  <span>{attribute.label}</span>
                  <span className="font-medium text-white">{attribute.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_52px]">
              <input
                type="number"
                min="1"
                max={Math.max(activeStock, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
                className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
              <button
                onClick={handleAddToCart}
                disabled={!activeStock}
                title={!isAuthenticated ? "Please log in to add items to your cart." : ""}
                className="rounded-2xl bg-brand-500 px-5 py-4 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag size={16} className="mr-2 inline-flex" />
                {isAuthenticated ? "Add to cart" : "Log in to add"}
              </button>
              <button
                type="button"
                onClick={handleWishlistClick}
                className={`rounded-2xl border px-4 py-4 transition duration-300 ${
                  wished ? "border-rose-400 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/5 text-white"
                }`}
              >
                <Heart size={18} fill={wished ? "currentColor" : "none"} />
              </button>
            </div>

            {reviewStatus && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {reviewStatus}
              </div>
            )}
          </div>

          {(limitedOffer?.enabled || settings.promotions?.bundle?.enabled || settings.promotions?.freeGift?.enabled) && (
            <div className="grid gap-4">
              {limitedOffer?.enabled && limitedOffer?.endsAt && (
                <CountdownTimer endDate={limitedOffer.endsAt} title={limitedOffer.title || "Limited time offer"} />
              )}

              {settings.promotions?.bundle?.enabled && (
                <div className="glass-panel rounded-[28px] p-5 shadow-ambient">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Bundle savings</p>
                  <p className="mt-2 font-semibold text-white">{settings.promotions.bundle.label || "Bundle deal"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Buy {settings.promotions.bundle.minQuantity}+ eligible tech items and get{" "}
                    {settings.promotions.bundle.discountPercent}% off.
                  </p>
                </div>
              )}

              {settings.promotions?.freeGift?.enabled && (
                <div className="glass-panel rounded-[28px] p-5 shadow-ambient">
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Free gift</p>
                  <p className="mt-2 font-semibold text-white">Buy {settings.promotions.freeGift.buyQuantity}, get 1 free</p>
                  <p className="mt-1 text-sm text-slate-300">
                    The free gift is automatically added at checkout when the promo conditions are met.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="glass-panel rounded-[36px] p-8 shadow-ambient">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-brand-100" size={18} />
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Customer reviews</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Buyer comments and social proof</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 font-semibold text-white">
                        {(review.user?.name || review.guestName || "U").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{review.user?.name || review.guestName || "Customer"}</p>
                        <p className="text-sm text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {review.verifiedPurchase && (
                      <div className="mt-3 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                        <ShieldCheck size={14} className="mr-2" />
                        Verified purchase
                      </div>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-amber-300">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-medium text-white">{review.rating}</span>
                  </div>
                </div>
                <p className="mt-4 text-slate-300">{review.comment}</p>
              </div>
            ))}

            {!reviews.length && (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">
                No reviews yet. Be the first buyer to leave a comment.
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-[36px] p-8 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Leave a review</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Share what buyers should know</h2>
          {!isAuthenticated ? (
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">
              Sign in to leave a review and build trust for other gadget buyers.
              <Link to="/auth" className="mt-4 inline-flex rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Posting as</p>
                <p className="mt-1 font-semibold text-white">{user?.name}</p>
              </div>
              <select
                value={reviewForm.rating}
                onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} star{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <textarea
                rows={5}
                value={reviewForm.comment}
                onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                placeholder="Talk about the quality, battery, value for money, or delivery experience."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
              <button className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
                Submit review
              </button>
            </form>
          )}
        </section>
      </div>

      {!!product.relatedProducts?.length && (
        <section className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Related tech</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Customers also viewed</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {product.relatedProducts.map((item) => (
              <ProductCard key={item._id} product={item} onAddToCart={addToCart} />
            ))}
          </div>
        </section>
      )}
      <AccessPromptModal
        open={Boolean(accessPromptMessage)}
        onClose={() => setAccessPromptMessage("")}
        returnTo={location.pathname}
        message={accessPromptMessage}
      />
    </div>
  );
}
  async function handleWishlistClick() {
    const result = await toggleWishlist(product._id);

    if (result?.requiresAuth) {
      setAccessPromptMessage("Please log in to save items to your wishlist.");
    }
  }
