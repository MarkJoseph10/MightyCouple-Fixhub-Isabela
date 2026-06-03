import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Gift,
  Mail,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Truck
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../api/client";
import TiltCard from "../../components/common/TiltCard";
import CountdownTimer from "../../components/store/CountdownTimer";
import ProductCard from "../../components/store/ProductCard";
import SearchFilters from "../../components/store/SearchFilters";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { optimizeImageUrl, resolveMediaUrl } from "../../utils/media";
import { readRecentlyViewed } from "../../utils/recentlyViewed";
import { getSiteUrl } from "../../utils/site";

const HOME_PRODUCTS_CACHE_KEY = "shopverse-home-products-cache";
const CATALOG_SEARCH_PENDING_KEY = "shopverse-native-catalog-search-pending";

export default function HomePage() {
  const location = useLocation();
  const categories = ["Phones", "Laptops", "Computer", "Parts", "Gadgets", "Accessories", "Wearables", "Gaming"];
  const { isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { settings } = useStoreSettings();
  const isNativeApp = Capacitor.isNativePlatform();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const heroVisualUrl = settings.heroImage?.url
    ? optimizeImageUrl(settings.heroImage.url, { width: 1600, height: 960, fit: "fill" })
    : settings.banner?.url
      ? optimizeImageUrl(settings.banner.url, { width: 1600, height: 960, fit: "fill" })
      : "";

  useEffect(() => {
    setRecentlyViewed(readRecentlyViewed());
  }, []);

  useEffect(() => {
    try {
      const cachedValue = window.sessionStorage.getItem(HOME_PRODUCTS_CACHE_KEY);

      if (!cachedValue) {
        return;
      }

      const parsedValue = JSON.parse(cachedValue);

      if (
        parsedValue &&
        parsedValue.search === search &&
        parsedValue.category === category &&
        parsedValue.sort === sort &&
        Array.isArray(parsedValue.products)
      ) {
        setProducts(parsedValue.products);
        setLoading(false);
      }
    } catch {
      // Ignore invalid cache.
    }
  }, [category, search, sort]);

  useEffect(() => {
    const previousTitle = document.title;
    const canonicalElement = document.querySelector('link[rel="canonical"]');
    const ogUrlElement = document.querySelector('meta[property="og:url"]');
    const previousCanonical = canonicalElement?.getAttribute("href");
    const previousOgUrl = ogUrlElement?.getAttribute("content");
    const createdCanonicalElement = !canonicalElement;
    const createdOgUrlElement = !ogUrlElement;
    const activeCanonicalElement = canonicalElement || document.createElement("link");
    const activeOgUrlElement = ogUrlElement || document.createElement("meta");
    const canonicalUrl = getSiteUrl(window.location.pathname + window.location.search);
    document.title = `${settings.storeName} | Affordable gadgets, COD, and installment checkout`;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.appendChild(descriptionMeta);
    }

    descriptionMeta.setAttribute(
      "content",
      settings.content?.heroDescription ||
        `Shop ${settings.storeName} for affordable gadgets, installment checkout, COD, shipping tracking, and live product updates.`
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
  }, [settings.content?.heroDescription, settings.storeName]);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);

      try {
        const { data } = await api.get("/products", {
          params: {
            search,
            category,
            sort
          }
        });
        setProducts(data);
        try {
          window.sessionStorage.setItem(
            HOME_PRODUCTS_CACHE_KEY,
            JSON.stringify({
              search,
              category,
              sort,
              products: data
            })
          );
        } catch {
          // Ignore storage failures.
        }
        setError("");
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load products right now.");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadProducts, 200);
    return () => clearTimeout(timer);
  }, [search, category, sort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, sort, perPage]);

  useEffect(() => {
    let shouldFocusSearch = location.hash === "#catalog-search";

    if (!shouldFocusSearch) {
      try {
        shouldFocusSearch = window.sessionStorage.getItem(CATALOG_SEARCH_PENDING_KEY) === "1";
      } catch {
        shouldFocusSearch = false;
      }
    }

    if (!shouldFocusSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById("catalog-search");
      const input = document.getElementById("catalog-search-input");

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      input?.focus();

      try {
        window.sessionStorage.removeItem(CATALOG_SEARCH_PENDING_KEY);
      } catch {
        // Ignore storage access failures.
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  async function handleNewsletterSubscribe(event) {
    event.preventDefault();

    try {
      const { data } = await api.post("/newsletter", { email: newsletterEmail });
      setNewsletterStatus(data.message || "Subscribed successfully.");
      setNewsletterEmail("");
    } catch (requestError) {
      setNewsletterStatus(requestError.response?.data?.message || "Unable to subscribe right now.");
    }
  }

  const limitedOffer = settings.promotions?.limitedOffer;
  const bundle = settings.promotions?.bundle;
  const freeGift = settings.promotions?.freeGift;
  const content = settings.content || {};
  const bestSellers = [...products]
    .sort((left, right) => {
      const soldGap = Number(right.soldCount || 0) - Number(left.soldCount || 0);
      if (soldGap !== 0) {
        return soldGap;
      }

      return Number(right.rating || 0) - Number(left.rating || 0);
    })
    .slice(0, 4);
  const visibleBestSellers = isNativeApp ? bestSellers.slice(0, 3) : bestSellers;
  const featuredCategories = categories
    .map((item) => {
      const categoryProducts = products.filter((product) => product.category === item);
      const leadProduct = [...categoryProducts].sort(
        (left, right) => Number(right.soldCount || 0) - Number(left.soldCount || 0)
      )[0];

      return {
        name: item,
        count: categoryProducts.length,
        image: leadProduct?.images?.[0]?.url,
        slug: leadProduct?.slug
      };
    })
    .filter((item) => item.count > 0)
    .slice(0, 4);
  const shopperTestimonials = [
    {
      name: "Alyssa Mae",
      label: "Repeat buyer",
      quote: `Easy checkout, clear prices, and mabilis makita ang legit social proof sa ${settings.storeName}.`,
      accent: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
    },
    {
      name: "Carlo D.",
      label: "COD customer",
      quote: "Helpful ang Track Order at COD option. Hindi nakakalito kahit sa phone lang ako nag-order.",
      accent: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
    },
    {
      name: "Mika P.",
      label: "Budget shopper",
      quote: "Maganda yung product cards, sold count, at ratings. Mas mabilis pumili ng sulit na gadget.",
      accent: "border-orange-400/20 bg-orange-400/10 text-orange-100"
    }
  ];
  const enabledPaymentLabels = [
    settings.paymentOptions?.gcash !== false ? "GCash" : null,
    settings.paymentOptions?.bankTransfer !== false ? "Bank transfer" : null,
    settings.paymentOptions?.cod !== false ? "COD" : null,
    settings.paymentOptions?.stripe !== false ? "Stripe" : null,
    settings.paymentOptions?.paypal !== false ? "PayPal" : null
  ].filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const paginatedProducts = products.slice((currentPage - 1) * perPage, currentPage * perPage);
  const visiblePageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 7) {
      return true;
    }

    return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
  });

  function handleResetCatalogFilters() {
    setSearch("");
    setCategory("All");
    setSort("popular");
    setPerPage(15);
  }

  return (
    <div className={`space-y-7 py-4 sm:py-5 lg:py-6 ${isNativeApp ? "space-y-5 py-3 sm:py-3" : ""}`}>
      {showPromoBanner && (
        <section className="page-shell">
          <div
            className={`glass-panel flex flex-col gap-3 border border-orange-400/20 bg-orange-500/10 text-orange-100 shadow-ambient md:flex-row md:items-center md:justify-between ${
              isNativeApp ? "rounded-[24px] px-4 py-3" : "rounded-[26px] px-4 py-3.5"
            }`}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-orange-300" size={18} />
              <div>
                <p className="font-semibold text-white">{content.announcement || "Affordable gadget deals are live."}</p>
                <p className={`text-orange-100/85 ${isNativeApp ? "text-[13px] leading-5" : "text-sm"}`}>
                  Browse phones, laptops, and trending tech with COD-ready checkout, social proof, and bundle savings.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPromoBanner(false)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition duration-300 hover:bg-white/10"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      <section className="page-shell">
        <div className="glass-panel overflow-hidden rounded-[30px] shadow-ambient">
          <div
            className={`relative grid gap-5 bg-mesh ${
              isNativeApp
                ? "px-4 py-5"
                : "px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,0.96fr)_280px] lg:px-7 lg:py-8 xl:grid-cols-[minmax(0,0.98fr)_300px]"
            }`}
            style={{
              backgroundImage: settings.heroImage?.url
                ? `linear-gradient(180deg, rgba(2,6,23,0.45), rgba(2,6,23,0.82)), url('${heroVisualUrl}')`
                : settings.banner?.url
                  ? `linear-gradient(180deg, rgba(2,6,23,0.45), rgba(2,6,23,0.82)), url('${heroVisualUrl}')`
                  : undefined,
              backgroundSize: settings.heroImage?.url || settings.banner?.url ? "cover" : undefined,
              backgroundPosition: settings.heroImage?.url || settings.banner?.url ? "center" : undefined
            }}
          >
            {heroVisualUrl ? (
              <img
                src={heroVisualUrl}
                alt=""
                aria-hidden="true"
                fetchpriority="high"
                loading="eager"
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />
            ) : null}
            <div className="min-w-0 space-y-4">
              <div className="inline-flex max-w-full items-center rounded-full bg-white/10 px-3.5 py-2 text-xs text-slate-200 sm:text-sm">
                <Sparkles size={15} className="mr-2 text-orange-300" />
                {content.heroEyebrow || "Affordable gadgets for every budget"}
              </div>
              <h1 className={`max-w-[13ch] font-semibold leading-[0.94] tracking-tight text-white ${isNativeApp ? "text-[2rem]" : "text-[clamp(1.8rem,4.15vw,3.35rem)]"}`}>
                {content.heroTitle || `${settings.storeName} makes phones, laptops, and trending tech feel reachable.`}
              </h1>
              <p className={`max-w-[42rem] text-slate-300 ${isNativeApp ? "text-sm leading-6" : "text-[0.92rem] leading-6 sm:text-[0.98rem]"}`}>
                {content.heroDescription || "Sell brand-new or budget-friendly gadgets with stronger trust signals: ratings, real buyer counts, promo timers, flexible payments, and COD for Philippine customers."}
              </p>
              <div className={`flex gap-3 ${isNativeApp ? "flex-col" : "flex-col sm:flex-row sm:flex-wrap"}`}>
                <a href="#catalog" className="inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white">
                  {content.primaryCtaLabel || "Shop gadgets"}
                </a>
                <Link to="/track-order" className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-100">
                  {content.secondaryCtaLabel || "Track an order"}
                </Link>
              </div>
              <div className={`grid gap-3 ${isNativeApp ? "grid-cols-2" : "sm:grid-cols-3"}`}>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Payments</p>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-white sm:text-base">
                    {isNativeApp ? enabledPaymentLabels.slice(0, 3).join(", ") || "Flexible payments" : enabledPaymentLabels.join(", ") || "Flexible payments"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Trust</p>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-white sm:text-base">
                    {isNativeApp ? "Ratings and buyer proof" : "Ratings, reviews, verified buyers"}
                  </p>
                </div>
                {!isNativeApp ? (
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Delivery</p>
                    <p className="mt-1.5 text-sm font-semibold leading-6 text-white sm:text-base">Location-based shipping ready</p>
                  </div>
                ) : null}
              </div>
            </div>

            {!isNativeApp ? (
              <div className="space-y-4">
              {limitedOffer?.enabled && limitedOffer?.endsAt && (
                <CountdownTimer endDate={limitedOffer.endsAt} title={limitedOffer.title || "Limited time offer"} />
              )}

              <TiltCard className="h-full">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-[26px] p-4.5 shadow-ambient"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 sm:text-sm">High-value checkout tools</p>
                  <div className="mt-3.5 space-y-3 text-[0.92rem] text-slate-200">
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <BadgeDollarSign size={16} className="mt-0.5 text-emerald-300" />
                      <div>
                        <p className="font-semibold text-white">Bundle savings</p>
                        <p>
                          {bundle?.enabled
                            ? `${bundle.label || "Bundle deal"} gives ${bundle.discountPercent}% off when buyers get ${bundle.minQuantity}+ eligible items.`
                            : "Bundle discounts can be activated by the store team any time."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <Gift size={16} className="mt-0.5 text-orange-300" />
                      <div>
                        <p className="font-semibold text-white">Free gift campaigns</p>
                        <p>
                          {freeGift?.enabled
                            ? `Buy ${freeGift.buyQuantity} items and automatically include a free gift at checkout.`
                            : "Set a free gift product from admin settings to boost conversions."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <Truck size={16} className="mt-0.5 text-cyan-300" />
                      <div>
                        <p className="font-semibold text-white">Philippines-friendly delivery</p>
                        <p>Checkout uses secure sign-in plus province-based shipping rules, with COD available where enabled.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TiltCard>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {!isNativeApp ? (
        <section className="page-shell grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            icon: SearchCheck,
            title: "Trending tech picks",
            description: "Show best-sellers, reviews, and units sold so budget-conscious buyers feel more confident."
          },
          {
            icon: ShieldCheck,
            title: "Trust-driven details",
            description: "Product pages now support ratings, verified purchase reviews, favorites, and real buyer activity."
          },
          {
            icon: Truck,
            title: "Flexible checkout",
            description: "Secure sign-in checkout, COD, promo codes, and shipping previews keep the path to purchase simple."
          }
        ].map((item) => (
          <TiltCard key={item.title}>
            <div className="glass-panel rounded-[30px] p-5 shadow-ambient">
              <item.icon size={18} className="text-brand-200" />
              <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.description}</p>
            </div>
          </TiltCard>
        ))}
        </section>
      ) : null}

      {!!featuredCategories.length && (
        <section className={`page-shell ${isNativeApp ? "space-y-3" : "space-y-5"}`}>
          <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${isNativeApp ? "gap-2" : ""}`}>
            <div>
              <p className={`uppercase tracking-[0.3em] text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>{content.featuredEyebrow || "Featured categories"}</p>
              <h2 className={`mt-2 font-semibold text-white ${isNativeApp ? "text-lg" : "text-2xl md:text-3xl"}`}>{content.featuredTitle || "Browse by gadget type"}</h2>
            </div>
            <p className={`max-w-2xl text-slate-400 ${isNativeApp ? "text-[12px] leading-5" : "text-sm"}`}>
              {content.featuredCaption || "Extra shortcut cards para mas mabilis makapunta ang buyers sa category na gusto nila, without changing your existing catalog flow."}
            </p>
          </div>
          <div className={`grid gap-4 ${isNativeApp ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
            {featuredCategories.map((item) => (
              <Link
                key={item.name}
                to={item.slug ? `/product/${item.slug}` : "#catalog"}
                className="group glass-panel overflow-hidden rounded-[28px] border border-white/10 shadow-ambient transition duration-300 hover:-translate-y-1 hover:border-brand-500/35"
              >
                <div className="relative h-44 overflow-hidden bg-slate-950/30">
                  {item.image ? (
                    <img
                      src={optimizeImageUrl(item.image, { width: 640, height: 360, fit: "fill" })}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">{item.name}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-lg font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-200">{item.count} listings ready to browse</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!bestSellers.length && (
        <section className={`page-shell ${isNativeApp ? "space-y-3" : "space-y-5"}`}>
          <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${isNativeApp ? "gap-2" : ""}`}>
            <div>
              <p className={`uppercase tracking-[0.3em] text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>Best sellers</p>
              <h2 className={`mt-2 font-semibold text-white ${isNativeApp ? "text-lg" : "text-2xl md:text-3xl"}`}>Shoppers keep picking these</h2>
            </div>
            <a href="#catalog" className={`inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-slate-200 transition duration-300 hover:bg-white/5 ${isNativeApp ? "text-[12px]" : "text-sm"}`}>
              See all products
            </a>
          </div>
          <div className={`grid ${isNativeApp ? "grid-cols-3 gap-2" : "gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"}`}>
            {visibleBestSellers.map((product) => (
              <ProductCard key={`best-seller-${product._id}`} product={product} onAddToCart={addToCart} compact eagerImage />
            ))}
          </div>
        </section>
      )}

      <section className={`page-shell ${isNativeApp ? "space-y-3" : "space-y-6"}`} id="catalog">
        <div className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${isNativeApp ? "gap-2" : ""}`}>
          <div className="min-w-0">
            <p className={`uppercase tracking-[0.3em] text-slate-400 ${isNativeApp ? "text-[11px]" : "text-sm"}`}>Storefront</p>
            <h2 className={`mt-2 font-semibold text-white ${isNativeApp ? "text-lg" : "text-2xl md:text-3xl xl:text-[2rem]"}`}>Affordable tech listings</h2>
          </div>
          {!isNativeApp ? (
            <div className="inline-flex items-center rounded-full bg-orange-500/10 px-4 py-2 text-xs text-orange-200 sm:text-sm">
              Popular gadgets with visible social proof and strong value offers
            </div>
          ) : null}
        </div>

        <SearchFilters
          containerId="catalog-search"
          searchInputId="catalog-search-input"
          search={search}
          category={category}
          sort={sort}
          perPage={perPage}
          categories={categories}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onSortChange={setSort}
          onPerPageChange={setPerPage}
          nativeCompact={isNativeApp}
        />

        {error && <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        {loading ? (
          <div className={`grid ${isNativeApp ? "grid-cols-3 gap-2" : "gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"}`}>
            {[...Array(10)].map((_, index) => (
              <div key={index} className={`glass-panel animate-pulse ${isNativeApp ? "aspect-[0.76] rounded-[18px]" : "h-[360px] rounded-[26px]"}`} />
            ))}
          </div>
        ) : (
          <div className={`grid ${isNativeApp ? "grid-cols-3 gap-2" : "gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"}`}>
            {paginatedProducts.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                onAddToCart={addToCart}
                compact
                eagerImage={currentPage === 1 && index < (isNativeApp ? 9 : 6)}
              />
            ))}
          </div>
        )}

        {!loading && !products.length && (
          <div className="glass-panel rounded-[28px] p-8 text-center shadow-ambient">
            <p className="text-lg font-medium text-white">No products matched your filters.</p>
            <p className="mt-2 text-sm text-slate-400">Try another search, category, or sorting option.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className={`rounded-[26px] border border-white/10 bg-white/5 px-4 py-4 ${isNativeApp ? "space-y-3" : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-sm text-slate-300">
                Showing {(currentPage - 1) * perPage + 1}-
                {Math.min(currentPage * perPage, products.length)} of {products.length} products
              </p>
              <button
                type="button"
                onClick={handleResetCatalogFilters}
                className="w-fit rounded-full border border-white/10 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
              >
                Reset filters
              </button>
            </div>
            <div className={`flex items-center gap-2 ${isNativeApp ? "overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "flex-wrap"}`}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              {visiblePageNumbers.map((pageNumber, index) => {
                const previous = visiblePageNumbers[index - 1];
                const showGap = previous && pageNumber - previous > 1;

                return (
                  <div key={pageNumber} className="flex items-center gap-2">
                    {showGap ? <span className="px-1 text-slate-500">...</span> : null}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`rounded-full px-3 py-2 text-sm transition ${
                        currentPage === pageNumber
                          ? "bg-brand-500 text-white"
                          : "border border-white/10 bg-slate-950/30 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {!!recentlyViewed.length && (
        <section className="page-shell">
          <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Recently viewed</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Pick up where you left off</h2>
              </div>
              <p className="text-sm text-slate-400">Fast access for repeat shoppers comparing gadgets and prices.</p>
            </div>
            <div className={`mt-6 grid gap-4 ${isNativeApp ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {recentlyViewed.map((product) => (
                <Link
                  key={product._id}
                  to={`/product/${product.slug}`}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-500/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <img src={resolveMediaUrl(product.image)} alt={product.name} className="h-28 w-full rounded-2xl object-cover sm:h-24 sm:w-24" loading="lazy" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{product.shortDescription}</p>
                      <p className="mt-3 text-sm font-semibold text-brand-100">{peso(product.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {!isNativeApp ? (
        <section className="page-shell grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Why shoppers stay</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Extra trust cues that make the store feel more premium</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Protected sign-in flow",
                copy: "Cart, checkout, and account features stay connected to real customer accounts for cleaner order history."
              },
              {
                icon: Truck,
                title: "Trackable delivery flow",
                copy: "Order IDs, tracking lookup, and clear status updates help buyers feel in control after checkout."
              },
              {
                icon: Gift,
                title: "Promos that feel alive",
                copy: "Bundle offers, free gifts, and limited-time sections make the storefront feel active instead of static."
              },
              {
                icon: BadgeDollarSign,
                title: "Budget-friendly checkout",
                copy: "COD, GCash, bank transfer, and clear pricing cues help reduce hesitation for first-time buyers."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                <item.icon size={18} className="text-brand-200" />
                <p className="mt-3 font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Testimonials</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Added social proof without changing the current flow</h2>
          <div className="mt-6 space-y-4">
            {shopperTestimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.label}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${testimonial.accent}`}>
                    Verified feel
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
        </section>
      ) : null}

      {!isNativeApp ? (
      <section className="page-shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Next step</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{content.nextStepTitle || `Turn ${settings.storeName} into a gadget brand people trust`}</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            {content.nextStepDescription || "Build trust with clear shipping policies, flexible payments, strong product pages, and a support channel buyers can rely on."}
          </p>
          {isAdmin ? (
            <Link to="/admin" className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-3 font-semibold text-slate-900">
              Open admin dashboard
              <ArrowRight size={16} className="ml-2" />
            </Link>
          ) : (
            <Link to="/contact" className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-3 font-semibold text-slate-900">
              Contact support
              <ArrowRight size={16} className="ml-2" />
            </Link>
          )}
        </div>

        <form onSubmit={handleNewsletterSubscribe} className="glass-panel rounded-[32px] p-6 shadow-ambient">
          <div className="inline-flex rounded-full bg-brand-500/15 p-3 text-brand-100">
            <Mail size={18} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Get promo alerts and new arrivals</h2>
          <p className="mt-2 text-sm text-slate-300">
            Build your email list for gadget drops, flash sales, and restock notices.
          </p>
          <input
            type="email"
            value={newsletterEmail}
            onChange={(event) => setNewsletterEmail(event.target.value)}
            placeholder="Enter your email"
            className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
          />
          {newsletterStatus && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {newsletterStatus}
            </div>
          )}
          <button className="mt-4 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
            Subscribe now
          </button>
        </form>
        </section>
      ) : null}
    </div>
  );
}
