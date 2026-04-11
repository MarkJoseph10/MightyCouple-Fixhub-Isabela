import { Capacitor } from "@capacitor/core";
import { Heart, MessageSquare, Share2, ShieldCheck, ShoppingBag, Star, TrendingUp, Users, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import AccessPromptModal from "../../components/common/AccessPromptModal";
import LoadingScreen from "../../components/common/LoadingScreen";
import ProductCard from "../../components/store/ProductCard";
import CountdownTimer from "../../components/store/CountdownTimer";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useChat } from "../../context/ChatContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useWishlist } from "../../context/WishlistContext";
import { peso } from "../../utils/commerce";
import { calculateInstallmentPlan, formatInstallmentBreakdown } from "../../utils/installments";
import { resolveMediaUrl } from "../../utils/media";
import { shareContent } from "../../utils/nativeShare";
import { pushRecentlyViewed } from "../../utils/recentlyViewed";
import { getSiteUrl } from "../../utils/site";

const initialReviewForm = {
  rating: 5,
  comment: ""
};

function withAbsoluteUrl(url = "") {
  return resolveMediaUrl(url);
}

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart, setSelectedOnly } = useCart();
  const { openChat } = useChat();
  const { settings } = useStoreSettings();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const isNativeApp = Capacitor.isNativePlatform();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [reviewStatus, setReviewStatus] = useState("");
  const [error, setError] = useState("");
  const [accessPrompt, setAccessPrompt] = useState({ title: "", message: "" });

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

    const previousTitle = document.title;
    const descriptionMetaElement = document.querySelector('meta[name="description"]');
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    const ogUrlElement = document.querySelector('meta[property="og:url"]');
    const previousDescription = descriptionMetaElement?.getAttribute("content");
    const previousCanonical = canonicalElement?.getAttribute("href");
    const previousOgUrl = ogUrlElement?.getAttribute("content");
    const createdDescriptionMeta = !descriptionMetaElement;
    const createdCanonicalElement = !canonicalElement;
    const createdOgUrlElement = !ogUrlElement;
    const activeDescriptionMeta = descriptionMetaElement || document.createElement("meta");
    const activeCanonicalElement = canonicalElement || document.createElement("link");
    const activeOgUrlElement = ogUrlElement || document.createElement("meta");
    const canonicalUrl = getSiteUrl(window.location.pathname + window.location.search);

    document.title = `${product.name} | ${settings.storeName}`;

    if (createdDescriptionMeta) {
      activeDescriptionMeta.setAttribute("name", "description");
      document.head.appendChild(activeDescriptionMeta);
    }

    activeDescriptionMeta.setAttribute(
      "content",
      product.shortDescription || product.description || `${product.name} available now on ${settings.storeName}.`
    );

    if (createdCanonicalElement) {
      activeCanonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(activeCanonicalElement);
    }
    activeCanonicalElement.setAttribute("href", canonicalUrl);

    if (createdOgUrlElement) {
      activeOgUrlElement.setAttribute("property", "og:url");
      document.head.appendChild(activeOgUrlElement);
    }
    activeOgUrlElement.setAttribute("content", canonicalUrl);

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) {
        activeDescriptionMeta.setAttribute("content", previousDescription);
      } else if (createdDescriptionMeta) {
        activeDescriptionMeta.remove();
      }

      if (previousCanonical !== null && previousCanonical !== undefined) {
        activeCanonicalElement.setAttribute("href", previousCanonical);
      } else if (createdCanonicalElement) {
        activeCanonicalElement.remove();
      }

      if (previousOgUrl !== null && previousOgUrl !== undefined) {
        activeOgUrlElement.setAttribute("content", previousOgUrl);
      } else if (createdOgUrlElement) {
        activeOgUrlElement.remove();
      }
    };
  }, [product, settings.storeName]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => String(variant._id) === String(selectedVariantId)) || null,
    [product, selectedVariantId]
  );
  const hasMeaningfulVariantStock = useMemo(
    () => Boolean(product?.variants?.some((variant) => Number(variant.stock || 0) > 0)),
    [product]
  );
  const mediaItems = useMemo(() => {
    if (!product) {
      return [];
    }

    const images = (product.images || []).map((image, index) => ({
      id: `image-${index}`,
      type: "image",
      url: withAbsoluteUrl(image.url),
      alt: image.alt || product.name
    }));

    const videoItem = product.video?.url
      ? [{
          id: "video-0",
          type: "video",
          url: withAbsoluteUrl(product.video.url),
          poster: withAbsoluteUrl(product.video.poster || product.images?.[0]?.url || ""),
          alt: `${product.name} product video`
        }]
      : [];

    return [...videoItem, ...images];
  }, [product]);
  const selectedMedia = useMemo(
    () => mediaItems.find((item) => item.id === selectedMediaId) || mediaItems[0] || null,
    [mediaItems, selectedMediaId]
  );

  useEffect(() => {
    if (!mediaItems.length) {
      setSelectedMediaId("");
      return;
    }

    setSelectedMediaId((current) => (mediaItems.some((item) => item.id === current) ? current : mediaItems[0].id));
  }, [mediaItems]);

  const activePrice = Number(selectedVariant?.price || product?.price || 0);
  const installmentPlan = useMemo(() => calculateInstallmentPlan(activePrice, settings), [activePrice, settings]);
  const canUseInstallment = installmentPlan.enabled && product?.vendorType !== "seller";
  const activeStock = hasMeaningfulVariantStock
    ? Number(selectedVariant?.stock || 0)
    : Number(product?.stock || 0);
  const isLowStock = activeStock > 0 && activeStock <= 5;
  const wished = product ? isWishlisted(product._id) : false;
  const limitedOffer = settings.promotions?.limitedOffer;

  async function handleAddToCart() {
    if (!product) {
      return;
    }

    if (!isAuthenticated) {
      setAccessPrompt({
        title: "Please log in to continue",
        message: "Please log in to add items to your cart."
      });
      return;
    }

    await addToCart(product, quantity, { variant: selectedVariant });
    setReviewStatus("Added to cart.");
  }

  async function handleBuyNow() {
    if (!product) {
      return;
    }

    if (!isAuthenticated) {
      setAccessPrompt({
        title: "Please log in to continue",
        message: "Please log in to continue with Buy now."
      });
      return;
    }

    const result = await addToCart(product, quantity, { variant: selectedVariant });

    if (result?.requiresAuth) {
      setAccessPrompt({
        title: "Please log in to continue",
        message: "Please log in to continue with Buy now."
      });
      return;
    }

    if (result?.outOfStock) {
      setReviewStatus("This item is currently out of stock.");
      return;
    }

    if (result?.cartKey) {
      setSelectedOnly([result.cartKey]);
    }

    navigate("/checkout");
  }

  async function handleWishlistClick() {
    if (!product) {
      return;
    }

    const result = await toggleWishlist(product._id);

    if (result?.requiresAuth) {
      setAccessPrompt({
        title: "Please log in to continue",
        message: "Please log in to save items to your wishlist."
      });
    }
  }

  async function handleNativeShare() {
    if (!product) {
      return;
    }

    await shareContent({
      title: product.name,
      text: product.shortDescription || product.description || `${product.name} is available on ${settings.storeName}.`,
      url: getSiteUrl(window.location.pathname + window.location.search),
      dialogTitle: "Share product"
    });
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
    <div className={`page-shell space-y-8 py-10 ${isNativeApp ? "space-y-4 py-3 pb-28" : ""}`}>
      <div className={`grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] ${isNativeApp ? "gap-4" : ""}`}>
        <div className={`space-y-6 ${isNativeApp ? "space-y-4" : ""}`}>
          <div className={`glass-panel overflow-hidden shadow-ambient ${isNativeApp ? "rounded-[24px]" : "rounded-[36px]"}`}>
            {selectedMedia?.type === "video" ? (
              <video
                src={selectedMedia.url}
                poster={selectedMedia.poster}
                controls
                className={`h-full w-full bg-slate-950 object-contain ${isNativeApp ? "min-h-[280px]" : "min-h-[420px]"}`}
              />
            ) : (
              <div className={`flex items-center justify-center bg-slate-950/30 ${isNativeApp ? "min-h-[280px] p-2" : "min-h-[420px] p-4 sm:p-6"}`}>
                <img
                  src={selectedMedia?.url || withAbsoluteUrl(product.images?.[0]?.url)}
                  alt={selectedMedia?.alt || product.images?.[0]?.alt || product.name}
                  className={`w-full object-scale-down ${isNativeApp ? "max-h-[320px]" : "max-h-[520px]"}`}
                />
              </div>
            )}
          </div>

          {!!mediaItems.length && (
            <div className={`gap-3 ${isNativeApp ? "flex overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4"}`}>
              {mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMediaId(item.id)}
                  className={`group overflow-hidden border transition ${isNativeApp ? "w-20 shrink-0 rounded-[18px]" : "rounded-[24px]"} ${
                    selectedMedia?.id === item.id
                      ? "border-brand-400 bg-brand-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="relative overflow-hidden">
                    {item.type === "video" ? (
                      <>
                        <img
                          src={item.poster || withAbsoluteUrl(product.images?.[0]?.url)}
                          alt={item.alt}
                          className={`w-full bg-slate-950/30 object-scale-down ${isNativeApp ? "h-16" : "h-24 sm:h-28"}`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white">
                          <Video size={isNativeApp ? 15 : 20} />
                        </div>
                      </>
                    ) : (
                      <img src={item.url} alt={item.alt} className={`w-full bg-slate-950/30 object-scale-down ${isNativeApp ? "h-16" : "h-24 sm:h-28"}`} />
                    )}
                  </div>
                  <div className={`text-left font-medium text-slate-300 ${isNativeApp ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-xs"}`}>
                    {item.type === "video" ? "Product video" : "Product image"}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className={`grid gap-4 ${isNativeApp ? "grid-cols-3 gap-2" : "md:grid-cols-3"}`}>
            <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[20px] p-3" : "rounded-[28px] p-5"}`}>
              <div className="flex items-center gap-3 text-amber-300">
                <Star size={isNativeApp ? 14 : 18} />
                <span className={`uppercase tracking-[0.28em] text-slate-400 ${isNativeApp ? "text-[9px]" : "text-sm"}`}>Average rating</span>
              </div>
              <p className={`font-semibold text-white ${isNativeApp ? "mt-2 text-lg" : "mt-3 text-3xl"}`}>{Number(product.rating || 0).toFixed(1)}</p>
              <p className={`text-slate-300 ${isNativeApp ? "mt-1 text-[10px]" : "mt-1 text-sm"}`}>{product.reviewCount || 0} review(s)</p>
            </div>
            <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[20px] p-3" : "rounded-[28px] p-5"}`}>
              <div className="flex items-center gap-3 text-orange-300">
                <Users size={isNativeApp ? 14 : 18} />
                <span className={`uppercase tracking-[0.28em] text-slate-400 ${isNativeApp ? "text-[9px]" : "text-sm"}`}>Buyers</span>
              </div>
              <p className={`font-semibold text-white ${isNativeApp ? "mt-2 text-lg" : "mt-3 text-3xl"}`}>{product.soldCount || 0}</p>
              <p className={`text-slate-300 ${isNativeApp ? "mt-1 text-[10px]" : "mt-1 text-sm"}`}>Units sold overall</p>
            </div>
            <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[20px] p-3" : "rounded-[28px] p-5"}`}>
              <div className="flex items-center gap-3 text-cyan-300">
                <TrendingUp size={isNativeApp ? 14 : 18} />
                <span className={`uppercase tracking-[0.28em] text-slate-400 ${isNativeApp ? "text-[9px]" : "text-sm"}`}>Last 24 hours</span>
              </div>
              <p className={`font-semibold text-white ${isNativeApp ? "mt-2 text-lg" : "mt-3 text-3xl"}`}>{product.recentSales24h || 0}</p>
              <p className={`text-slate-300 ${isNativeApp ? "mt-1 text-[10px]" : "mt-1 text-sm"}`}>Units moved today</p>
            </div>
          </div>
        </div>

        <div className={`space-y-6 ${isNativeApp ? "space-y-4" : ""}`}>
          <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[36px] p-8"}`}>
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

            <h1 className={`mt-3 font-semibold text-white ${isNativeApp ? "text-[1.2rem] leading-snug" : "text-4xl"}`}>{product.name}</h1>
            <p className={`mt-2 text-slate-300 ${isNativeApp ? "text-[12px] leading-5" : "mt-4 text-lg"}`}>{product.description}</p>

            <div className={`mt-4 flex justify-between ${isNativeApp ? "flex-col items-start gap-2" : "items-center"}`}>
              <div>
                <p className="text-sm text-slate-400">Price</p>
                <div className={`flex items-end gap-3 ${isNativeApp ? "mt-1" : ""}`}>
                  <p className={`font-semibold text-brand-50 ${isNativeApp ? "text-[1.65rem]" : "text-3xl"}`}>{peso(activePrice)}</p>
                  {product.compareAtPrice > activePrice && (
                    <p className={`text-slate-500 line-through ${isNativeApp ? "pb-0.5 text-xs" : "pb-1 text-sm"}`}>{peso(product.compareAtPrice)}</p>
                  )}
                </div>
              </div>
              <div className={`rounded-2xl px-4 py-3 ${isNativeApp ? "text-xs" : "text-sm"} ${
                !activeStock
                  ? "bg-rose-500/15 text-rose-100"
                  : isLowStock
                    ? "bg-amber-500/15 text-amber-100"
                    : "bg-white/5 text-slate-200"
              }`}>
                {!activeStock ? "Sold out" : `Stock: ${activeStock}`}
              </div>
            </div>

            {canUseInstallment ? (
              <div className={`mt-4 border border-cyan-400/20 bg-cyan-500/10 text-cyan-50 ${isNativeApp ? "rounded-[22px] p-3 text-[12px]" : "rounded-[28px] p-4 text-sm"}`}>
                <p className="font-semibold text-white">Installment / Paluwagan available</p>
                <p className="mt-2">{formatInstallmentBreakdown(installmentPlan)}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p>Service fee: {peso(installmentPlan.serviceFeeAmount)}</p>
                  <p>Grace period: {installmentPlan.gracePeriodDays} day(s)</p>
                  <p>
                    Release: {installmentPlan.releaseCondition === "admin_approved_early_release"
                      ? "Admin-approved early release possible"
                      : "Release after full payment"}
                  </p>
                  <p className="text-amber-100">Payments made are non-refundable under the installment agreement.</p>
                </div>
              </div>
            ) : installmentPlan.configured ? (
              <div className={`mt-4 border border-rose-400/20 bg-rose-500/10 text-rose-100 ${isNativeApp ? "rounded-[22px] p-3 text-[12px]" : "rounded-[28px] p-4 text-sm"}`}>
                <p className="font-semibold text-white">Installment / Paluwagan unavailable</p>
                <p className="mt-2">
                  {product?.vendorType === "seller"
                    ? "Seller marketplace products are not yet eligible for installment checkout."
                    : "The installment plan needs a valid down payment and schedule before customers can use it at checkout."}
                </p>
              </div>
            ) : null}

            {isLowStock ? (
              <div className={`mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100 ${isNativeApp ? "text-[12px]" : "text-sm"}`}>
                Low stock alert: only {activeStock} item{activeStock === 1 ? "" : "s"} left for this selection.
              </div>
            ) : null}

            {!!product.variants?.length && (
              <div className="mt-6">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Choose variant</p>
                <div className={`mt-3 grid gap-3 ${isNativeApp ? "gap-2" : ""}`}>
                  {product.variants.map((variant) => {
                    const label = [variant.name, variant.color, variant.storage, variant.model].filter(Boolean).join(" | ");

                    return (
                      <button
                        key={variant._id}
                        type="button"
                        onClick={() => setSelectedVariantId(String(variant._id))}
                        className={`border text-left transition duration-300 ${
                          isNativeApp ? "rounded-[18px] px-3 py-3" : "rounded-[24px] px-4 py-4"
                        } ${
                          String(selectedVariantId) === String(variant._id)
                            ? "border-brand-400 bg-brand-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className={`font-medium text-white ${isNativeApp ? "text-sm leading-5" : ""}`}>{label || "Default variant"}</p>
                            <p className={`text-slate-400 ${isNativeApp ? "mt-1 text-[11px]" : "mt-1 text-sm"}`}>SKU: {variant.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold text-brand-100 ${isNativeApp ? "text-sm" : ""}`}>{peso(variant.price || product.price)}</p>
                            <p className={`text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>{variant.stock} left</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`mt-5 grid gap-4 border border-white/10 bg-white/5 ${isNativeApp ? "rounded-[22px] gap-3 p-4" : "rounded-[28px] p-5"}`}>
              {(product.attributes || []).map((attribute) => (
                <div key={attribute.label} className={`flex items-center justify-between gap-4 text-slate-300 ${isNativeApp ? "text-[12px]" : "text-sm"}`}>
                  <span>{attribute.label}</span>
                  <span className="font-medium text-white">{attribute.value}</span>
                </div>
              ))}
            </div>

            {!isNativeApp ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_58px]">
              <div className="w-full shrink-0">
                <input
                  type="number"
                  min="1"
                  max={Math.max(activeStock, 1)}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
                  className="h-full min-h-[58px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!activeStock}
                title={!isAuthenticated ? "Please log in to add items to your cart." : ""}
                className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-4 text-center font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag size={16} />
                <span className="whitespace-nowrap">{isAuthenticated ? "Add to cart" : "Log in to add"}</span>
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!activeStock}
                title={!isAuthenticated ? "Please log in to continue with Buy now." : ""}
                className="inline-flex min-h-[58px] items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-5 py-4 text-center font-semibold text-cyan-50 transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="whitespace-nowrap">Buy now</span>
              </button>
              <button
                type="button"
                onClick={handleWishlistClick}
                className={`inline-flex min-h-[58px] items-center justify-center rounded-2xl border px-4 py-4 transition duration-300 ${
                  wished ? "border-rose-400 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/5 text-white"
                } w-full shrink-0 sm:w-[58px]`}
              >
                <Heart size={18} fill={wished ? "currentColor" : "none"} />
              </button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-[70px_minmax(0,1fr)] gap-2">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(activeStock, 1)}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
                    className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-center text-sm text-white outline-none"
                  />
                <button
                  type="button"
                  onClick={handleWishlistClick}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-300 ${
                    wished ? "border-rose-400 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  <Heart size={18} fill={wished ? "currentColor" : "none"} />
                  {wished ? "Saved" : "Save"}
                </button>
              </div>
            )}

              <button
                type="button"
                  onClick={async () => {
                    if (!isAuthenticated) {
                    setAccessPrompt({
                      title: "Please log in to continue",
                      message: "Please log in first so the seller can reply to your product chat."
                    });
                    return;
                  }

                  if (user?.role && user.role !== "customer") {
                    setAccessPrompt({
                      title: "Customer account required",
                      message: "Product chat is for customer inquiries. Sellers and admins can continue replies from the Messages inbox."
                    });
                    return;
                  }

                await openChat(product);
              }}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 ${isNativeApp ? "min-h-[44px] py-2" : "min-h-[52px] py-3"}`}
              >
                <MessageSquare size={16} className="text-brand-200" />
                Chat about this product
              </button>
              {isNativeApp ? (
                <button
                  type="button"
                  onClick={() => handleNativeShare().catch(() => {})}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                >
                  <Share2 size={16} className="text-brand-200" />
                  Share this product
                </button>
              ) : null}

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
                <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[22px] p-4" : "rounded-[28px] p-5"}`}>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Bundle savings</p>
                  <p className="mt-2 font-semibold text-white">{settings.promotions.bundle.label || "Bundle deal"}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Buy {settings.promotions.bundle.minQuantity}+ eligible tech items and get{" "}
                    {settings.promotions.bundle.discountPercent}% off.
                  </p>
                </div>
              )}

              {settings.promotions?.freeGift?.enabled && (
                <div className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[22px] p-4" : "rounded-[28px] p-5"}`}>
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

      <div className={`grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] ${isNativeApp ? "gap-4" : ""}`}>
        <section className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[36px] p-8"}`}>
          <div className="flex items-center gap-3">
            <MessageSquare className="text-brand-100" size={18} />
            <div>
              <p className={`uppercase tracking-[0.28em] text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>Customer reviews</p>
              <h2 className={`mt-1 font-semibold text-white ${isNativeApp ? "text-lg" : "text-2xl"}`}>Buyer comments and social proof</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className={`border border-white/10 bg-white/5 ${isNativeApp ? "rounded-[20px] p-4" : "rounded-[28px] p-5"}`}>
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

        <section className={`glass-panel shadow-ambient ${isNativeApp ? "rounded-[24px] p-4" : "rounded-[36px] p-8"}`}>
          <p className={`uppercase tracking-[0.28em] text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>Leave a review</p>
          <h2 className={`mt-2 font-semibold text-white ${isNativeApp ? "text-lg" : "text-2xl"}`}>Share what buyers should know</h2>
          {!isAuthenticated ? (
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5 text-slate-300">
              Sign in to leave a review and build trust for other gadget buyers.
              <Link to="/auth" className="mt-4 inline-flex rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4">
              <div className={`border border-white/10 bg-white/5 ${isNativeApp ? "rounded-[20px] p-4" : "rounded-[28px] p-5"}`}>
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
            <h2 className={`mt-2 font-semibold text-white ${isNativeApp ? "text-xl" : "text-3xl"}`}>Customers also viewed</h2>
          </div>
          <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-4 ${isNativeApp ? "grid-cols-3 gap-2" : ""}`}>
            {product.relatedProducts.map((item) => (
              <ProductCard key={item._id} product={item} onAddToCart={addToCart} compact={isNativeApp} />
            ))}
          </div>
        </section>
      )}
      <AccessPromptModal
        open={Boolean(accessPrompt.message)}
        title={accessPrompt.title || "Please log in to continue"}
        onClose={() => setAccessPrompt({ title: "", message: "" })}
        returnTo={location.pathname}
        message={accessPrompt.message}
      />
      {isNativeApp ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs uppercase tracking-[0.22em] text-slate-500">Ready to checkout</p>
              <p className="truncate text-lg font-semibold text-white">{peso(activePrice)}</p>
              <p className="text-xs text-slate-400">{!activeStock ? "Sold out" : `${activeStock} in stock`}</p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!activeStock}
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <ShoppingBag size={16} />
              Cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!activeStock}
              className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Buy now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
