import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CreditCard,
  Gift,
  ImagePlus,
  MapPinned,
  Palette,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import StatsCard from "../../components/admin/StatsCard";
import LoadingScreen from "../../components/common/LoadingScreen";
import OrderStatusBadge from "../../components/common/OrderStatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";

const sectionTabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "insights", label: "Insights", icon: Sparkles },
  { id: "operations", label: "Operations", icon: Settings2 },
  { id: "branding", label: "Branding", icon: Palette }
];

function createLocationFee() {
  return {
    label: "",
    keyword: "",
    fee: 0
  };
}

function createPromoCode() {
  return {
    code: "",
    type: "percent",
    value: 0,
    active: true
  };
}

function buildSettingsForm(settings) {
  return {
    storeName: settings.storeName || "Mighty Couple",
    logoUrl: settings.logo?.url || "",
    bannerUrl: settings.banner?.url || "",
    heroImageUrl: settings.heroImage?.url || "",
    shippingMode: settings.shipping?.mode || "fixed",
    fixedFee: Number(settings.shipping?.fixedFee || 0),
    locationFees: settings.shipping?.locationFees?.length
      ? settings.shipping.locationFees.map((item) => ({
          label: item.label || "",
          keyword: item.keyword || "",
          fee: Number(item.fee || 0)
        }))
      : [createLocationFee()],
    paymentOptions: {
      stripe: settings.paymentOptions?.stripe !== false,
      paypal: settings.paymentOptions?.paypal !== false,
      gcash: settings.paymentOptions?.gcash !== false,
      maya: settings.paymentOptions?.maya !== false,
      bankTransfer: settings.paymentOptions?.bankTransfer !== false,
      cod: settings.paymentOptions?.cod !== false
    },
    gcashAccountName: settings.paymentDetails?.gcash?.accountName || "",
    gcashNumber: settings.paymentDetails?.gcash?.number || "",
    gcashQrUrl: settings.paymentDetails?.gcash?.qrUrl || "",
    bankName: settings.paymentDetails?.bankTransfer?.bankName || "",
    bankAccountName: settings.paymentDetails?.bankTransfer?.accountName || "",
    bankAccountNumber: settings.paymentDetails?.bankTransfer?.accountNumber || "",
    bankQrUrl: settings.paymentDetails?.bankTransfer?.qrUrl || "",
    proofOfPaymentRequired: {
      gcash: settings.paymentDetails?.proofOfPaymentRequired?.gcash !== false,
      bankTransfer: settings.paymentDetails?.proofOfPaymentRequired?.bankTransfer !== false,
      maya: settings.paymentDetails?.proofOfPaymentRequired?.maya !== false,
      paypal: settings.paymentDetails?.proofOfPaymentRequired?.paypal === true,
      stripe: settings.paymentDetails?.proofOfPaymentRequired?.stripe === true,
      cod: settings.paymentDetails?.proofOfPaymentRequired?.cod === true
    },
    autoCancelUnpaidHours: Number(settings.orderRules?.autoCancelUnpaidHours || 24),
    lowStockThreshold: Number(settings.metrics?.lowStockThreshold || 5),
    bundleEnabled: settings.promotions?.bundle?.enabled === true,
    bundleMinQuantity: Number(settings.promotions?.bundle?.minQuantity || 2),
    bundleDiscountPercent: Number(settings.promotions?.bundle?.discountPercent || 10),
    bundleLabel: settings.promotions?.bundle?.label || "Bundle deal",
    freeGiftEnabled: settings.promotions?.freeGift?.enabled === true,
    freeGiftBuyQuantity: Number(settings.promotions?.freeGift?.buyQuantity || 2),
    freeGiftProductId: settings.promotions?.freeGift?.giftProductId || "",
    limitedOfferEnabled: settings.promotions?.limitedOffer?.enabled === true,
    limitedOfferTitle: settings.promotions?.limitedOffer?.title || "Limited time offer",
    limitedOfferEndsAt: settings.promotions?.limitedOffer?.endsAt || "",
    limitedOfferDiscountPercent: Number(settings.promotions?.limitedOffer?.discountPercent || 0),
    promoCodes: settings.promotions?.promoCodes?.length
      ? settings.promotions.promoCodes.map((promo) => ({
          code: promo.code || "",
          type: promo.type === "fixed" ? "fixed" : "percent",
          value: Number(promo.value || 0),
          active: promo.active !== false
        }))
      : [createPromoCode()]
  };
}

function getPeriodKey(mode) {
  const current = new Date();

  if (mode === "month") {
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  }

  if (mode === "week") {
    const workingDate = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
    const dayNumber = workingDate.getUTCDay() || 7;
    workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((workingDate - yearStart) / 86400000) + 1) / 7);

    return `${workingDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }

  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
}

function getSeriesValue(series, mode) {
  const match = (series || []).find((item) => item.label === getPeriodKey(mode));
  return Number(match?.value || 0);
}

function formatSeriesLabel(label) {
  if (!label) {
    return "";
  }

  if (label.includes("-W")) {
    const [year, week] = label.split("-W");
    return `${week}/${year.slice(-2)}`;
  }

  if (label.length === 7) {
    const [year, month] = label.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-PH", {
      month: "short"
    });
  }

  return new Date(label).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric"
  });
}

function InputField({ label, helper, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</span>
      {children}
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  );
}

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <section className="glass-panel rounded-[32px] p-5 shadow-ambient sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        {description && <p className="max-w-xl text-sm text-slate-400">{description}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function QuickLink({ to, icon: Icon, title, caption }) {
  return (
    <Link
      to={to}
      className="rounded-[28px] border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:bg-white/10"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-50">
        <Icon size={18} />
      </div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{caption}</p>
    </Link>
  );
}

function RevenueChart({ title, series, accentClass }) {
  const maxValue = Math.max(...(series || []).map((item) => Number(item.value || 0)), 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Revenue trend</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-xs text-slate-300">
          {(series || []).length} data points
        </div>
      </div>
      <div className="mt-6 grid h-44 grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-end gap-3">
        {(series || []).map((item, index) => {
          const height = `${Math.max(16, (Number(item.value || 0) / maxValue) * 100)}%`;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex min-w-0 flex-col items-center gap-3"
            >
              <div className="text-[11px] text-slate-400">{peso(item.value)}</div>
              <div className="flex h-28 w-full items-end">
                <div className={`w-full rounded-t-3xl bg-gradient-to-t ${accentClass}`} style={{ height }} />
              </div>
              <div className="text-[11px] text-slate-500">{formatSeriesLabel(item.label)}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatusMixCard({ ordersByStatus = [], totalOrders = 0 }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Order status mix</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Live fulfillment pulse</h3>
      <div className="mt-5 space-y-3">
        {ordersByStatus.length ? (
          ordersByStatus.map((item) => {
            const percent = totalOrders ? (Number(item.count || 0) / totalOrders) * 100 : 0;

            return (
              <div key={item._id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <OrderStatusBadge status={item._id} />
                  <span className="text-sm text-slate-300">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-900/70">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400"
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            No order statuses yet. The mix chart will light up once orders start moving.
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { settings, setSettings, refreshSettings } = useStoreSettings();
  const { user, setUserData } = useAuth();
  const [stats, setStats] = useState(null);
  const [settingsForm, setSettingsForm] = useState(() => buildSettingsForm(settings));
  const [adminForm, setAdminForm] = useState({
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSettingsForm(buildSettingsForm(settings));
  }, [settings]);

  useEffect(() => {
    setAdminForm((current) => ({
      ...current,
      email: user?.email || ""
    }));
  }, [user?.email]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [{ data: statsData }, { data: adminSettings }] = await Promise.all([
          api.get("/stats"),
          api.get("/settings")
        ]);

        setStats(statsData);
        setSettings(adminSettings);
        setSettingsForm(buildSettingsForm(adminSettings));
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [setSettings]);

  const overview = stats?.overview || {};
  const insights = stats?.insights || {};
  const dailyRevenue = getSeriesValue(stats?.charts?.dailyRevenue, "day");
  const weeklyRevenue = getSeriesValue(stats?.charts?.weeklyRevenue, "week");
  const monthlyRevenue = getSeriesValue(stats?.charts?.monthlyRevenue, "month");
  const totalOrders = Number(overview.totalOrders || 0);

  const sectionClassName = (sectionId) =>
    activeSection === sectionId ? "block" : "hidden lg:block";

  const promoCodeCount = useMemo(
    () => settingsForm.promoCodes.filter((promo) => String(promo.code || "").trim()).length,
    [settingsForm.promoCodes]
  );

  function updateFormField(field, value) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateNestedField(group, field, value) {
    setSettingsForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value
      }
    }));
  }

  function updateLocationFee(index, field, value) {
    setSettingsForm((current) => ({
      ...current,
      locationFees: current.locationFees.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "fee" ? Number(value || 0) : value
            }
          : item
      )
    }));
  }

  function addLocationFee() {
    setSettingsForm((current) => ({
      ...current,
      locationFees: [...current.locationFees, createLocationFee()]
    }));
  }

  function removeLocationFee(index) {
    setSettingsForm((current) => ({
      ...current,
      locationFees: current.locationFees.length === 1
        ? [createLocationFee()]
        : current.locationFees.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function updatePromoCode(index, field, value) {
    setSettingsForm((current) => ({
      ...current,
      promoCodes: current.promoCodes.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "value"
                  ? Number(value || 0)
                  : field === "active"
                    ? Boolean(value)
                    : value
            }
          : item
      )
    }));
  }

  function addPromoCode() {
    setSettingsForm((current) => ({
      ...current,
      promoCodes: [...current.promoCodes, createPromoCode()]
    }));
  }

  function removePromoCode(index) {
    setSettingsForm((current) => ({
      ...current,
      promoCodes: current.promoCodes.length === 1
        ? [createPromoCode()]
        : current.promoCodes.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function handleAssetUpload(field, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingField(field);
    setError("");

    try {
      const payload = new FormData();
      payload.append("image", file);

      const { data } = await api.post("/uploads", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const uploadedUrl = `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${data.imageUrl}`;
      updateFormField(field, uploadedUrl);
      setStatus("Asset uploaded. Save dashboard settings to publish it.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload image.");
    } finally {
      setUploadingField("");
    }
  }

  async function handleSaveDashboard(event) {
    event.preventDefault();
    setSavingDashboard(true);
    setError("");
    setStatus("");

    try {
      const payload = {
        storeName: settingsForm.storeName,
        shipping: {
          mode: settingsForm.shippingMode,
          fixedFee: Number(settingsForm.fixedFee || 0),
          locationFees: settingsForm.locationFees
            .map((item) => ({
              label: item.label,
              keyword: item.keyword,
              fee: Number(item.fee || 0)
            }))
            .filter((item) => item.label || item.keyword)
        },
        logo: {
          url: settingsForm.logoUrl,
          alt: `${settingsForm.storeName} logo`
        },
        banner: {
          url: settingsForm.bannerUrl,
          alt: `${settingsForm.storeName} banner`
        },
        heroImage: {
          url: settingsForm.heroImageUrl,
          alt: `${settingsForm.storeName} hero image`
        },
        paymentOptions: settingsForm.paymentOptions,
        paymentDetails: {
          gcash: {
            accountName: settingsForm.gcashAccountName,
            number: settingsForm.gcashNumber,
            qrUrl: settingsForm.gcashQrUrl
          },
          bankTransfer: {
            bankName: settingsForm.bankName,
            accountName: settingsForm.bankAccountName,
            accountNumber: settingsForm.bankAccountNumber,
            qrUrl: settingsForm.bankQrUrl
          },
          proofOfPaymentRequired: settingsForm.proofOfPaymentRequired
        },
        orderRules: {
          autoCancelUnpaidHours: Number(settingsForm.autoCancelUnpaidHours || 24)
        },
        promotions: {
          bundle: {
            enabled: settingsForm.bundleEnabled,
            minQuantity: Number(settingsForm.bundleMinQuantity || 2),
            discountPercent: Number(settingsForm.bundleDiscountPercent || 0),
            label: settingsForm.bundleLabel
          },
          freeGift: {
            enabled: settingsForm.freeGiftEnabled,
            buyQuantity: Number(settingsForm.freeGiftBuyQuantity || 2),
            giftProductId: settingsForm.freeGiftProductId
          },
          limitedOffer: {
            enabled: settingsForm.limitedOfferEnabled,
            title: settingsForm.limitedOfferTitle,
            endsAt: settingsForm.limitedOfferEndsAt,
            discountPercent: Number(settingsForm.limitedOfferDiscountPercent || 0)
          },
          promoCodes: settingsForm.promoCodes
            .map((promo) => ({
              code: String(promo.code || "").trim().toUpperCase(),
              type: promo.type === "fixed" ? "fixed" : "percent",
              value: Number(promo.value || 0),
              active: promo.active !== false
            }))
            .filter((promo) => promo.code)
        },
        metrics: {
          lowStockThreshold: Number(settingsForm.lowStockThreshold || 0)
        }
      };

      const { data } = await api.put("/settings", payload);
      setSettings(data.settings);
      setSettingsForm(buildSettingsForm(data.settings));
      await refreshSettings().catch(() => null);
      setStatus("Dashboard controls updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save dashboard settings.");
    } finally {
      setSavingDashboard(false);
    }
  }

  async function handleSaveAdmin(event) {
    event.preventDefault();
    setSavingAdmin(true);
    setError("");
    setStatus("");

    if (adminForm.newPassword && adminForm.newPassword !== adminForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      setSavingAdmin(false);
      return;
    }

    try {
      const { data } = await api.put("/auth/admin-profile", {
        email: adminForm.email,
        currentPassword: adminForm.currentPassword,
        newPassword: adminForm.newPassword || undefined
      });

      setUserData(data.user);
      setAdminForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      setStatus("Admin credentials updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update admin credentials.");
    } finally {
      setSavingAdmin(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading admin dashboard..." />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin cockpit</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Modern control center for {settings.storeName}</h1>
        </div>
        <div className="rounded-[28px] border border-brand-400/20 bg-gradient-to-r from-brand-500/20 to-cyan-400/10 px-5 py-4 text-sm text-slate-100">
          Live charts, mobile-first controls, and touch-ready store settings
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto lg:hidden">
        {sectionTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
              activeSection === id ? "bg-brand-500 text-white" : "border border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {status && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div>}
      {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <AnimatePresence mode="wait">
        <motion.div key={activeSection} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className={sectionClassName("overview")}>
            <SectionCard
              eyebrow="Overview"
              title="Revenue, orders, and quick admin actions"
              description="Your most important business numbers stay visible first, with recent orders and live status mix underneath."
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <StatsCard label="Daily revenue" value={{ numericValue: dailyRevenue, type: "currency" }} helper="Revenue collected for the current calendar day." tone="brand" />
                    <StatsCard label="Weekly revenue" value={{ numericValue: weeklyRevenue, type: "currency" }} helper="Revenue collected for the current ISO week." tone="emerald" />
                    <StatsCard label="Monthly revenue" value={{ numericValue: monthlyRevenue, type: "currency" }} helper="Revenue collected for the current month." tone="cyan" />
                    <StatsCard label="Estimated profit" value={{ numericValue: overview.estimatedProfit || 0, type: "currency" }} helper="Based on selling price minus cost price from paid orders." tone="amber" />
                    <StatsCard label="Conversion rate" value={{ numericValue: overview.conversionRate || 0, type: "percent" }} helper={`${overview.totalOrders || 0} orders from ${insights.cartAdds || 0} tracked cart adds.`} tone="brand" />
                    <StatsCard label="Audience" value={{ numericValue: overview.totalUsers || 0, type: "number" }} helper={`${overview.newsletterSubscribers || 0} newsletter subscribers on file.`} tone="cyan" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <QuickLink to="/admin/products" icon={Boxes} title="Products" caption="Edit catalog, variants, and trending tags." />
                    <QuickLink to="/admin/orders" icon={ShoppingBag} title="Orders" caption="Verify payment and move orders through fulfillment." />
                    <QuickLink to="/admin/customers" icon={Users} title="Customers" caption="Review customer accounts and recent activity." />
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Store pulse</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{settings.storeName}</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    Affordable gadgets, phones, laptops, and trending tech products with account-based cart and wishlist access.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Orders</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{overview.totalOrders || 0}</p>
                      <p className="mt-2 text-sm text-slate-400">All-time order volume in the current database.</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Products</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{overview.totalProducts || 0}</p>
                      <p className="mt-2 text-sm text-slate-400">Active catalog items tracked in the storefront.</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-3xl border border-brand-400/15 bg-brand-500/10 p-4 text-sm text-brand-50">
                    Shipping mode: <span className="font-semibold capitalize">{settingsForm.shippingMode}</span>
                    <span className="mx-2 text-brand-200">•</span>
                    Payment options active: <span className="font-semibold">{Object.values(settingsForm.paymentOptions).filter(Boolean).length}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Recent orders</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">Latest buyer activity</h3>
                    </div>
                    <Link to="/admin/orders" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      Open orders
                    </Link>
                  </div>
                  <div className="mt-5 space-y-3">
                    {stats?.recentOrders?.length ? (
                      stats.recentOrders.map((order) => (
                        <div key={order._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-white">{order.user?.name || order.shippingAddress?.name || "Guest order"}</p>
                              <p className="mt-1 text-sm text-slate-400">{order.user?.email || order.shippingAddress?.email || "No email on file"}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <OrderStatusBadge status={order.status} />
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{peso(order.pricing?.total)}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                            <span>{new Date(order.createdAt).toLocaleString()}</span>
                            <span className="capitalize">{String(order.payment?.method || "").replaceAll("_", " ")}</span>
                            <span>{order.items?.length || 0} items</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
                        No recent orders yet. Once buyers check out, their latest activity will appear here.
                      </div>
                    )}
                  </div>
                </div>

                <StatusMixCard ordersByStatus={stats?.ordersByStatus || []} totalOrders={totalOrders} />
              </div>
            </SectionCard>
          </div>

          <div className={sectionClassName("insights")}>
            <SectionCard
              eyebrow="Insights"
              title="Charts, best sellers, and stock alerts"
              description="Charts stay light and mobile-friendly, while your hottest products and stock risks stay easy to scan."
            >
              <div className="grid gap-4 xl:grid-cols-3">
                <RevenueChart title="Daily revenue" series={stats?.charts?.dailyRevenue || []} accentClass="from-brand-500 via-brand-400 to-cyan-400" />
                <RevenueChart title="Weekly revenue" series={stats?.charts?.weeklyRevenue || []} accentClass="from-emerald-500 via-emerald-400 to-cyan-400" />
                <RevenueChart title="Monthly revenue" series={stats?.charts?.monthlyRevenue || []} accentClass="from-orange-500 via-amber-400 to-brand-400" />
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Best selling</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Products driving volume</h3>
                  <div className="mt-5 space-y-3">
                    {insights.bestSellingProducts?.length ? (
                      insights.bestSellingProducts.map((product) => (
                        <div key={product._id} className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-slate-950/25 p-3">
                          <img src={product.images?.[0]?.url} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-white">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{product.category}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                              <span>{product.soldCount || 0} sold</span>
                              <span>{Number(product.rating || 0).toFixed(1)} avg rating</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                        Best sellers will appear after your first paid orders.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Most viewed</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Products getting attention</h3>
                  <div className="mt-5 space-y-3">
                    {insights.mostViewedProducts?.length ? (
                      insights.mostViewedProducts.map((product) => (
                        <div key={product._id} className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                          <div className="flex items-center gap-3">
                            <img src={product.images?.[0]?.url} alt={product.name} className="h-14 w-14 rounded-2xl object-cover" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{product.name}</p>
                              <p className="text-sm text-slate-400">{product.category}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                            <span>{product.viewsCount || 0} views</span>
                            <span>{product.soldCount || 0} sold</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                        Product view insights will populate as shoppers browse the store.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                    <AlertTriangle size={14} className="text-orange-300" />
                    Low stock watch
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-white">Products that need restock attention</h3>
                  <div className="mt-5 space-y-3">
                    {insights.lowStockProducts?.length ? (
                      insights.lowStockProducts.map((product) => (
                        <div key={product._id} className="rounded-[24px] border border-orange-400/15 bg-orange-500/10 p-4">
                          <p className="font-semibold text-white">{product.name}</p>
                          <p className="mt-1 text-sm text-slate-300">{product.category}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-200">
                            <span>Main stock: {product.stock || 0}</span>
                            <span>
                              Variant alerts: {(product.variants || []).filter((variant) => Number(variant.stock || 0) <= settingsForm.lowStockThreshold).length}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[24px] border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                        No low-stock alerts right now. Great time to keep pushing promotions.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className={sectionClassName("operations")}>
            <form onSubmit={handleSaveDashboard} className="space-y-6">
              <SectionCard
                eyebrow="Operations"
                title="Shipping, payment, promotion, and stock controls"
                description="Everything here updates the live store after saving, including checkout fees and accepted payment methods."
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <MapPinned size={16} className="text-cyan-300" />
                      Shipping settings
                    </div>
                    <div className="mt-5 grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => updateFormField("shippingMode", "fixed")}
                          className={`rounded-[24px] border px-4 py-4 text-left transition ${
                            settingsForm.shippingMode === "fixed"
                              ? "border-brand-400/30 bg-brand-500/10 text-white"
                              : "border-white/10 bg-slate-950/20 text-slate-300"
                          }`}
                        >
                          <p className="font-semibold">Fixed fee</p>
                          <p className="mt-1 text-sm text-slate-400">One shipping fee for all areas.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFormField("shippingMode", "location")}
                          className={`rounded-[24px] border px-4 py-4 text-left transition ${
                            settingsForm.shippingMode === "location"
                              ? "border-brand-400/30 bg-brand-500/10 text-white"
                              : "border-white/10 bg-slate-950/20 text-slate-300"
                          }`}
                        >
                          <p className="font-semibold">Location based</p>
                          <p className="mt-1 text-sm text-slate-400">Different fees for Metro Manila, Luzon, and VisMin.</p>
                        </button>
                      </div>

                      <InputField label="Fallback shipping fee">
                        <input
                          type="number"
                          value={settingsForm.fixedFee}
                          onChange={(event) => updateFormField("fixedFee", Number(event.target.value || 0))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                        />
                      </InputField>

                      {settingsForm.shippingMode === "location" && (
                        <div className="space-y-3">
                          {settingsForm.locationFees.map((item, index) => (
                            <div key={`${item.label}-${index}`} className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/25 p-4 md:grid-cols-[1fr_1.1fr_140px]">
                              <input value={item.label} onChange={(event) => updateLocationFee(index, "label", event.target.value)} placeholder="Metro Manila" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                              <input value={item.keyword} onChange={(event) => updateLocationFee(index, "keyword", event.target.value)} placeholder="manila, makati, qc" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                              <div className="flex gap-3">
                                <input type="number" value={item.fee} onChange={(event) => updateLocationFee(index, "fee", event.target.value)} placeholder="80" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                                <button type="button" onClick={() => removeLocationFee(index)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5">
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={addLocationFee} className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-slate-300">
                            Add location fee
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <CreditCard size={16} className="text-emerald-300" />
                      Payment settings
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        ["gcash", "GCash"],
                        ["bankTransfer", "Bank transfer"],
                        ["cod", "Cash on delivery"],
                        ["stripe", "Stripe"],
                        ["paypal", "PayPal"],
                        ["maya", "Maya"]
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/25 px-4 py-4 text-sm text-slate-200">
                          <span>{label}</span>
                          <input type="checkbox" checked={settingsForm.paymentOptions[key]} onChange={(event) => updateNestedField("paymentOptions", key, event.target.checked)} />
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <InputField label="GCash account name">
                        <input value={settingsForm.gcashAccountName} onChange={(event) => updateFormField("gcashAccountName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                      <InputField label="GCash number">
                        <input value={settingsForm.gcashNumber} onChange={(event) => updateFormField("gcashNumber", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                      <InputField label="Bank name">
                        <input value={settingsForm.bankName} onChange={(event) => updateFormField("bankName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                      <InputField label="Bank account name">
                        <input value={settingsForm.bankAccountName} onChange={(event) => updateFormField("bankAccountName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                      <InputField label="Bank account number">
                        <input value={settingsForm.bankAccountNumber} onChange={(event) => updateFormField("bankAccountNumber", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                      <InputField label="Auto-cancel unpaid orders (hours)">
                        <input type="number" value={settingsForm.autoCancelUnpaidHours} onChange={(event) => updateFormField("autoCancelUnpaidHours", Number(event.target.value || 0))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </InputField>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <Gift size={16} className="text-orange-300" />
                      Promotions
                    </div>
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">Bundle discount</span>
                            <input type="checkbox" checked={settingsForm.bundleEnabled} onChange={(event) => updateFormField("bundleEnabled", event.target.checked)} />
                          </div>
                          <div className="mt-4 grid gap-3">
                            <input value={settingsForm.bundleLabel} onChange={(event) => updateFormField("bundleLabel", event.target.value)} placeholder="Bundle deal" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input type="number" value={settingsForm.bundleMinQuantity} onChange={(event) => updateFormField("bundleMinQuantity", Number(event.target.value || 0))} placeholder="Min quantity" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                              <input type="number" value={settingsForm.bundleDiscountPercent} onChange={(event) => updateFormField("bundleDiscountPercent", Number(event.target.value || 0))} placeholder="Discount %" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                            </div>
                          </div>
                        </label>

                        <label className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">Free gift</span>
                            <input type="checkbox" checked={settingsForm.freeGiftEnabled} onChange={(event) => updateFormField("freeGiftEnabled", event.target.checked)} />
                          </div>
                          <div className="mt-4 grid gap-3">
                            <input type="number" value={settingsForm.freeGiftBuyQuantity} onChange={(event) => updateFormField("freeGiftBuyQuantity", Number(event.target.value || 0))} placeholder="Buy quantity" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                            <input value={settingsForm.freeGiftProductId} onChange={(event) => updateFormField("freeGiftProductId", event.target.value)} placeholder="Gift product ID" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                          </div>
                        </label>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-white">Limited time offer</span>
                          <input type="checkbox" checked={settingsForm.limitedOfferEnabled} onChange={(event) => updateFormField("limitedOfferEnabled", event.target.checked)} />
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <input value={settingsForm.limitedOfferTitle} onChange={(event) => updateFormField("limitedOfferTitle", event.target.value)} placeholder="Limited time offer" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                          <input type="datetime-local" value={settingsForm.limitedOfferEndsAt} onChange={(event) => updateFormField("limitedOfferEndsAt", event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                          <input type="number" value={settingsForm.limitedOfferDiscountPercent} onChange={(event) => updateFormField("limitedOfferDiscountPercent", Number(event.target.value || 0))} placeholder="Discount %" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                      <AlertTriangle size={16} className="text-orange-300" />
                      Inventory watch
                    </div>
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                        <p className="font-medium text-white">Low-stock threshold</p>
                        <p className="mt-1 text-sm text-slate-400">Products at or below this level get highlighted in insights.</p>
                        <input type="number" value={settingsForm.lowStockThreshold} onChange={(event) => updateFormField("lowStockThreshold", Number(event.target.value || 0))} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                          <span>Require GCash proof</span>
                          <input type="checkbox" checked={settingsForm.proofOfPaymentRequired.gcash} onChange={(event) => updateNestedField("proofOfPaymentRequired", "gcash", event.target.checked)} />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-200">
                          <span>Require bank transfer proof</span>
                          <input type="checkbox" checked={settingsForm.proofOfPaymentRequired.bankTransfer} onChange={(event) => updateNestedField("proofOfPaymentRequired", "bankTransfer", event.target.checked)} />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">Promo codes</p>
                            <p className="mt-1 text-sm text-slate-400">{promoCodeCount} configured right now.</p>
                          </div>
                          <button type="button" onClick={addPromoCode} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                            Add code
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {settingsForm.promoCodes.map((promo, index) => (
                            <div key={`${promo.code}-${index}`} className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/30 p-4 md:grid-cols-[1fr_130px_130px_auto]">
                              <input value={promo.code} onChange={(event) => updatePromoCode(index, "code", event.target.value)} placeholder="SAVE10" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                              <select value={promo.type} onChange={(event) => updatePromoCode(index, "type", event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none">
                                <option value="percent">Percent</option>
                                <option value="fixed">Fixed PHP</option>
                              </select>
                              <input type="number" value={promo.value} onChange={(event) => updatePromoCode(index, "value", event.target.value)} placeholder="10" className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                              <div className="flex gap-2">
                                <label className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                                  <input type="checkbox" checked={promo.active !== false} onChange={(event) => updatePromoCode(index, "active", event.target.checked)} />
                                </label>
                                <button type="button" onClick={() => removePromoCode(index)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5">
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
                    {savingDashboard ? "Saving dashboard..." : "Save dashboard settings"}
                  </button>
                  <button type="button" onClick={() => setSettingsForm(buildSettingsForm(settings))} className="rounded-2xl border border-white/10 px-5 py-3 text-slate-200 transition duration-300 hover:bg-white/5">
                    Reset unsaved changes
                  </button>
                </div>
              </SectionCard>
            </form>
          </div>

          <div className={sectionClassName("branding")}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <form onSubmit={handleSaveDashboard}>
                <SectionCard
                  eyebrow="Branding"
                  title="Store identity and homepage media"
                  description="Update your storefront name, logo, banner, and hero image without touching code."
                >
                  <div className="grid gap-4">
                    <InputField label="Store name">
                      <input value={settingsForm.storeName} onChange={(event) => updateFormField("storeName", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                    </InputField>

                    {[
                      ["logoUrl", "Store logo"],
                      ["bannerUrl", "Homepage banner"],
                      ["heroImageUrl", "Hero image"]
                    ].map(([field, label]) => (
                      <div key={field} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row">
                          <div className="flex-1 space-y-3">
                            <InputField label={label}>
                              <input value={settingsForm[field]} onChange={(event) => updateFormField(field, event.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                            </InputField>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                              <ImagePlus size={16} />
                              <span>{uploadingField === field ? "Uploading..." : `Upload ${label.toLowerCase()}`}</span>
                              <input type="file" className="hidden" onChange={(event) => handleAssetUpload(field, event)} />
                            </label>
                          </div>
                          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/30 lg:w-56">
                            {settingsForm[field] ? (
                              <img src={settingsForm[field]} alt={label} className="h-36 w-full object-cover lg:h-full" />
                            ) : (
                              <div className="flex h-36 items-center justify-center px-4 text-center text-sm text-slate-500">Preview will appear here</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-3">
                      <button className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
                        {savingDashboard ? "Saving branding..." : "Save branding"}
                      </button>
                      <button type="button" onClick={() => setSettingsForm(buildSettingsForm(settings))} className="rounded-2xl border border-white/10 px-5 py-3 text-slate-200 transition duration-300 hover:bg-white/5">
                        Reset branding fields
                      </button>
                    </div>
                  </div>
                </SectionCard>
              </form>

              <form onSubmit={handleSaveAdmin}>
                <SectionCard
                  eyebrow="Admin settings"
                  title="Secure admin account updates"
                  description="Change the admin email or password with validation, while keeping the current session updated."
                >
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                      Admin access stays private. No demo credentials are shown anywhere in the storefront UI.
                    </div>

                    <InputField label="Admin email">
                      <input type="email" value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                    </InputField>
                    <InputField label="Current password" helper="Required before any credential change is saved.">
                      <input type="password" value={adminForm.currentPassword} onChange={(event) => setAdminForm((current) => ({ ...current, currentPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                    </InputField>
                    <InputField label="New password">
                      <input type="password" value={adminForm.newPassword} onChange={(event) => setAdminForm((current) => ({ ...current, newPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                    </InputField>
                    <InputField label="Confirm new password">
                      <input type="password" value={adminForm.confirmPassword} onChange={(event) => setAdminForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                    </InputField>

                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck size={18} className="mt-1 text-emerald-300" />
                        <div className="text-sm text-slate-300">
                          Passwords must include uppercase, lowercase, and a number with at least 8 characters.
                        </div>
                      </div>
                    </div>

                    <button className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
                      {savingAdmin ? "Updating admin..." : "Save admin credentials"}
                    </button>
                  </div>
                </SectionCard>
              </form>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default DashboardPage;
