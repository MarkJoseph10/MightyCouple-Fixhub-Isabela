import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Gift,
  Mail,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Truck
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import TiltCard from "../../components/common/TiltCard";
import CountdownTimer from "../../components/store/CountdownTimer";
import ProductCard from "../../components/store/ProductCard";
import SearchFilters from "../../components/store/SearchFilters";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";
import { readRecentlyViewed } from "../../utils/recentlyViewed";

export default function HomePage() {
  const categories = ["Phones", "Laptops", "Gadgets", "Accessories", "Wearables", "Gaming"];
  const { isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { settings } = useStoreSettings();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setRecentlyViewed(readRecentlyViewed());
  }, []);

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
  const enabledPaymentLabels = [
    settings.paymentOptions?.gcash !== false ? "GCash" : null,
    settings.paymentOptions?.bankTransfer !== false ? "Bank transfer" : null,
    settings.paymentOptions?.cod !== false ? "COD" : null,
    settings.paymentOptions?.stripe !== false ? "Stripe" : null,
    settings.paymentOptions?.paypal !== false ? "PayPal" : null
  ].filter(Boolean);

  return (
    <div className="space-y-10 py-10">
      {showPromoBanner && (
        <section className="page-shell">
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] border border-orange-400/20 bg-orange-500/10 p-4 text-orange-100 shadow-ambient md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-orange-300" size={18} />
              <div>
                <p className="font-semibold text-white">Affordable gadget deals are live.</p>
                <p className="text-sm text-orange-100/85">
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
        <div className="glass-panel overflow-hidden rounded-[36px] shadow-ambient">
          <div
            className="grid gap-10 bg-mesh px-6 py-10 md:px-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14"
            style={{
              backgroundImage: settings.heroImage?.url
                ? `linear-gradient(180deg, rgba(2,6,23,0.45), rgba(2,6,23,0.82)), url('${settings.heroImage.url}')`
                : settings.banner?.url
                  ? `linear-gradient(180deg, rgba(2,6,23,0.45), rgba(2,6,23,0.82)), url('${settings.banner.url}')`
                  : undefined,
              backgroundSize: settings.heroImage?.url || settings.banner?.url ? "cover" : undefined,
              backgroundPosition: settings.heroImage?.url || settings.banner?.url ? "center" : undefined
            }}
          >
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                <Sparkles size={16} className="mr-2 text-orange-300" />
                Affordable gadgets for every budget
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {settings.storeName} makes phones, laptops, and trending tech feel reachable.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300">
                Sell brand-new or budget-friendly gadgets with stronger trust signals: ratings, real buyer counts, promo timers,
                flexible payments, and COD for Philippine customers.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#catalog" className="rounded-full bg-brand-500 px-5 py-3 font-semibold text-white">
                  Shop gadgets
                </a>
                <Link to="/track-order" className="rounded-full border border-white/10 px-5 py-3 text-slate-100">
                  Track an order
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Payments</p>
                  <p className="mt-2 text-lg font-semibold text-white">{enabledPaymentLabels.join(", ") || "Flexible payments"}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Trust</p>
                  <p className="mt-2 text-lg font-semibold text-white">Ratings, reviews, verified buyers</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Delivery</p>
                  <p className="mt-2 text-lg font-semibold text-white">Location-based shipping ready</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {limitedOffer?.enabled && limitedOffer?.endsAt && (
                <CountdownTimer endDate={limitedOffer.endsAt} title={limitedOffer.title || "Limited time offer"} />
              )}

              <TiltCard className="h-full">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-[32px] p-6 shadow-ambient"
                >
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">High-value checkout tools</p>
                  <div className="mt-5 space-y-4 text-sm text-slate-200">
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <BadgeDollarSign size={18} className="mt-0.5 text-emerald-300" />
                      <div>
                        <p className="font-semibold text-white">Bundle savings</p>
                        <p>
                          {bundle?.enabled
                            ? `${bundle.label || "Bundle deal"} gives ${bundle.discountPercent}% off when buyers get ${bundle.minQuantity}+ eligible items.`
                            : "Bundle discounts can be activated by the store team any time."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <Gift size={18} className="mt-0.5 text-orange-300" />
                      <div>
                        <p className="font-semibold text-white">Free gift campaigns</p>
                        <p>
                          {freeGift?.enabled
                            ? `Buy ${freeGift.buyQuantity} items and automatically include a free gift at checkout.`
                            : "Set a free gift product from admin settings to boost conversions."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <Truck size={18} className="mt-0.5 text-cyan-300" />
                      <div>
                        <p className="font-semibold text-white">Philippines-friendly delivery</p>
                        <p>Checkout uses secure sign-in plus province-based shipping rules, with COD available where enabled.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TiltCard>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-4 lg:grid-cols-3">
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
            <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <item.icon size={18} className="text-brand-200" />
              <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.description}</p>
            </div>
          </TiltCard>
        ))}
      </section>

      <section className="page-shell space-y-6" id="catalog">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Storefront</p>
            <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Affordable tech listings</h2>
          </div>
          <div className="inline-flex items-center rounded-full bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
            Popular gadgets with visible social proof and strong value offers
          </div>
        </div>

        <SearchFilters
          search={search}
          category={category}
          sort={sort}
          categories={categories}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onSortChange={setSort}
        />

        {error && <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="glass-panel h-[420px] animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        )}

        {!loading && !products.length && (
          <div className="glass-panel rounded-[28px] p-8 text-center shadow-ambient">
            <p className="text-lg font-medium text-white">No products matched your filters.</p>
            <p className="mt-2 text-sm text-slate-400">Try another search, category, or sorting option.</p>
          </div>
        )}
      </section>

      {!!recentlyViewed.length && (
        <section className="page-shell">
          <div className="glass-panel rounded-[36px] p-8 shadow-ambient">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Recently viewed</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Pick up where you left off</h2>
              </div>
              <p className="text-sm text-slate-400">Fast access for repeat shoppers comparing gadgets and prices.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentlyViewed.map((product) => (
                <Link
                  key={product._id}
                  to={`/product/${product.slug}`}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-500/30"
                >
                  <div className="flex gap-4">
                    <img src={product.image} alt={product.name} className="h-24 w-24 rounded-2xl object-cover" loading="lazy" />
                    <div>
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

      <section className="page-shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glass-panel rounded-[36px] p-8 shadow-ambient">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Next step</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Turn {settings.storeName} into a gadget brand people trust</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Build trust with clear shipping policies, flexible payments, strong product pages, and a support channel buyers can rely on.
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

        <form onSubmit={handleNewsletterSubscribe} className="glass-panel rounded-[36px] p-8 shadow-ambient">
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
    </div>
  );
}
