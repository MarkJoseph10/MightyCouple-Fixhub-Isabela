import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Boxes, ImagePlus, PackageSearch, Sparkles, Tag, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TagInput from "../../components/admin/TagInput";
import api from "../../api/client";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";

const mediaBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");
const maxVideoSizeBytes = 20 * 1024 * 1024;
const maxVideoDurationSeconds = 30;

const initialForm = {
  name: "",
  shortDescription: "",
  description: "",
  category: "Phones",
  condition: "Affordable tech",
  popularityLabel: "Trending tech pick",
  price: 0,
  costPrice: 0,
  compareAtPrice: 0,
  stock: 0,
  sku: "",
  tags: [],
  images: [],
  video: null,
  featured: false,
  bundleEligible: true,
  rating: 0,
  reviewCount: 0,
  soldCount: 0,
  manualRecentSales24h: 0,
  variantsText: "",
  attributesText: ""
};

const mobileViews = [
  { id: "editor", label: "Editor", icon: Tag },
  { id: "catalog", label: "Catalog", icon: Boxes }
];

const fallbackTagSuggestions = [
  "#trending",
  "#budgettech",
  "#smartphone",
  "#laptopdeal",
  "#gadgetfinds",
  "#techsale",
  "#musthave",
  "#onhandph"
];

function withAbsoluteUrl(url = "") {
  return resolveMediaUrl(url);
}

function parseVariants(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, color, storage, model, price, stock, sku, isDefault] = line.split("|").map((part) => part.trim());
      return {
        name,
        color,
        storage,
        model,
        price: Number(price || 0),
        stock: Number(stock || 0),
        sku,
        isDefault: isDefault === "true"
      };
    });
}

function parseAttributes(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|").map((part) => part.trim());
      return { label, value };
    })
    .filter((item) => item.label && item.value);
}

function formatVariants(variants = []) {
  return variants
    .map((variant) =>
      [
        variant.name || "",
        variant.color || "",
        variant.storage || "",
        variant.model || "",
        variant.price || 0,
        variant.stock || 0,
        variant.sku || "",
        variant.isDefault ? "true" : "false"
      ].join("|")
    )
    .join("\n");
}

function formatAttributes(attributes = []) {
  return attributes.map((attribute) => `${attribute.label}|${attribute.value}`).join("\n");
}

function buildFallbackTagSuggestions(products = []) {
  const tagCounts = new Map();

  products.forEach((product) => {
    (product.tags || []).forEach((tag) => {
      tagCounts.set(tag, Number(tagCounts.get(tag) || 0) + 1);
    });
  });

  const ranked = [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag, count]) => ({
      tag,
      count,
      trending: count > 1
    }));

  fallbackTagSuggestions.forEach((tag) => {
    if (!ranked.some((item) => item.tag === tag)) {
      ranked.push({ tag, count: 0, trending: true });
    }
  });

  return ranked.slice(0, 12);
}

function InputField({ label, children, helper }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</span>
      {children}
      {helper && <span className="text-xs text-slate-500">{helper}</span>}
    </label>
  );
}

function swapItems(items, fromIndex, toIndex) {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read video metadata."));
    };
  });
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("editor");

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const adminManagedProducts = useMemo(() => products.filter((product) => product.vendorType !== "seller"), [products]);
  const sellerReviewProducts = useMemo(
    () => products.filter((product) => product.vendorType === "seller" && ["pending", "rejected"].includes(product.approvalStatus || "pending")),
    [products]
  );

  async function loadProducts() {
    const { data } = await api.get("/products/admin");
    setProducts(data);
    return data;
  }

  async function loadTagSuggestions(productsData = []) {
    try {
      const { data } = await api.get("/products/tags/suggestions");
      setTagSuggestions(data);
    } catch {
      setTagSuggestions(buildFallbackTagSuggestions(productsData));
    }
  }

  useEffect(() => {
    async function loadPageData() {
      try {
        const productsData = await loadProducts();
        await loadTagSuggestions(productsData);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load products.");
      }
    }

    loadPageData();
  }, []);

  async function refreshCatalog() {
    const productsData = await loadProducts();
    await loadTagSuggestions(productsData);
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setUploadingImages(true);
    setStatus("");
    setError("");

    try {
      const uploadedImages = [];

      for (const file of files) {
        const payload = new FormData();
        payload.append("image", file);

        const { data } = await api.post("/uploads", payload, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        uploadedImages.push({
          url: withAbsoluteUrl(data.imageUrl || data.url),
          alt: form.name || file.name.replace(/\.[^.]+$/, "")
        });
      }

      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploadedImages]
      }));
      setStatus(`${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"} uploaded successfully.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload image.");
    } finally {
      event.target.value = "";
      setUploadingImages(false);
    }
  }

  async function handleVideoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingVideo(true);
    setStatus("");
    setError("");

    try {
      if (!file.type.startsWith("video/")) {
        throw new Error("Please upload a valid video file.");
      }

      if (file.size > maxVideoSizeBytes) {
        throw new Error("Video must be 20MB or smaller.");
      }

      const durationSeconds = await getVideoDuration(file);

      if (durationSeconds > maxVideoDurationSeconds) {
        throw new Error(`Video must be ${maxVideoDurationSeconds} seconds or shorter.`);
      }

      const payload = new FormData();
      payload.append("video", file);

      const { data } = await api.post("/uploads/video", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setForm((current) => ({
        ...current,
        video: {
          url: withAbsoluteUrl(data.url),
          poster: current.images[0]?.url || "",
          durationSeconds,
          sizeBytes: file.size,
          mimeType: file.type
        }
      }));
      setStatus("Product video uploaded successfully.");
    } catch (requestError) {
      setError(requestError.message || requestError.response?.data?.message || "Unable to upload video.");
    } finally {
      event.target.value = "";
      setUploadingVideo(false);
    }
  }

  function removeImage(index) {
    setForm((current) => {
      const nextImages = current.images.filter((_, imageIndex) => imageIndex !== index);

      return {
        ...current,
        images: nextImages,
        video: current.video ? { ...current.video, poster: nextImages[0]?.url || current.video.poster || "" } : null
      };
    });
  }

  function moveImage(index, direction) {
    setForm((current) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.images.length) {
        return current;
      }

      const nextImages = swapItems(current.images, index, targetIndex);

      return {
        ...current,
        images: nextImages,
        video: current.video ? { ...current.video, poster: nextImages[0]?.url || current.video.poster || "" } : null
      };
    });
  }

  function updateImageAlt(index, alt) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => (imageIndex === index ? { ...image, alt } : image))
    }));
  }

  function clearVideo() {
    setForm((current) => ({ ...current, video: null }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    const payload = {
      name: form.name,
      shortDescription: form.shortDescription,
      description: form.description,
      category: form.category,
      condition: form.condition,
      popularityLabel: form.popularityLabel,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      compareAtPrice: Number(form.compareAtPrice),
      stock: Number(form.stock),
      sku: form.sku,
      featured: form.featured,
      bundleEligible: form.bundleEligible,
      rating: Number(form.rating),
      reviewCount: Number(form.reviewCount),
      soldCount: Number(form.soldCount),
      manualRecentSales24h: Number(form.manualRecentSales24h),
      tags: form.tags,
      images: form.images.map((image) => ({ url: image.url, alt: image.alt || form.name })),
      video: form.video
        ? {
            ...form.video,
            poster: form.video.poster || form.images[0]?.url || ""
          }
        : null,
      variants: parseVariants(form.variantsText),
      attributes: parseAttributes(form.attributesText)
    };

    try {
      if (isEditing) {
        await api.put(`/products/${editingId}`, payload);
        setStatus("Product updated.");
      } else {
        await api.post("/products", payload);
        setStatus("Product created.");
      }

      setForm(initialForm);
      setEditingId("");
      await refreshCatalog();
      setActiveView("catalog");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save product.");
    }
  }

  async function handleDelete(productId) {
    try {
      await api.delete(`/products/${productId}`);
      setStatus("Product deleted.");
      await refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    }
  }

  async function handleReviewProduct(productId, approvalStatus) {
    try {
      await api.patch(`/products/${productId}/review`, { approvalStatus });
      setStatus(`Product ${approvalStatus}.`);
      await refreshCatalog();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to review seller product.");
    }
  }

  function beginEdit(product) {
    if (product.vendorType === "seller") {
      setError("Seller listings are review-only for admin. Use approve or reject instead of editing them directly.");
      setStatus("");
      return;
    }

    setEditingId(product._id);
    setForm({
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      category: product.category,
      condition: product.condition || "Affordable tech",
      popularityLabel: product.popularityLabel || "Trending tech pick",
      price: product.price,
      costPrice: product.costPrice || 0,
      compareAtPrice: product.compareAtPrice || 0,
      stock: product.stock,
      sku: product.sku || "",
      tags: product.tags || [],
      images: (product.images || []).map((image) => ({
        url: withAbsoluteUrl(image.url),
        alt: image.alt || product.name
      })),
      video: product.video?.url
        ? {
            ...product.video,
            url: withAbsoluteUrl(product.video.url),
            poster: withAbsoluteUrl(product.video.poster || product.images?.[0]?.url || "")
          }
        : null,
      featured: Boolean(product.featured),
      bundleEligible: product.bundleEligible !== false,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      soldCount: product.soldCount || 0,
      manualRecentSales24h: product.manualRecentSales24h || 0,
      variantsText: formatVariants(product.variants),
      attributesText: formatAttributes(product.attributes)
    });
    setActiveView("editor");
  }

  const editorPanelClasses = activeView === "editor" ? "block" : "hidden xl:block";
  const catalogPanelClasses = activeView === "catalog" ? "block" : "hidden xl:block";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Product management</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Smart catalog editor</h1>
        </div>
        <div className="self-start rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-50">
          Touch-friendly tags, variants, and mobile-ready product controls
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto xl:hidden">
        {mobileViews.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveView(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
              activeView === id ? "bg-brand-500 text-white" : "border border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {status && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{status}</div>}
      {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <motion.form
          layout
          onSubmit={handleSubmit}
          className={`${editorPanelClasses} glass-panel rounded-[32px] p-6 shadow-ambient`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Editor</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{isEditing ? "Update product details" : "Add a new product"}</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {form.tags.length} tag{form.tags.length === 1 ? "" : "s"} selected
            </div>
          </div>

          <div className="mt-6 grid gap-6">
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                <Sparkles size={16} className="text-orange-300" />
                Essentials
              </div>
              <div className="mt-5 grid gap-4">
                <InputField label="Product name">
                  <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nova X Pro Smartphone" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Short description">
                  <input value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} placeholder="Fast summary for grid cards" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Full description">
                  <textarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe specs, target buyer, and value proposition." className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Category">
                    <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none">
                      <option>Phones</option>
                      <option>Laptops</option>
                    <option>Computer</option>
                    <option>Parts</option>
                    <option>Gadgets</option>
                      <option>Accessories</option>
                      <option>Wearables</option>
                      <option>Gaming</option>
                    </select>
                  </InputField>
                  <InputField label="SKU">
                    <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} placeholder="SKU-2026-001" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                  </InputField>
                  <InputField label="Condition">
                    <input value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))} placeholder="Affordable tech" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                  </InputField>
                  <InputField label="Popularity label">
                    <input value={form.popularityLabel} onChange={(event) => setForm((current) => ({ ...current, popularityLabel: event.target.value }))} placeholder="Trending tech pick" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                  </InputField>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                <Tag size={16} className="text-brand-200" />
                Tags and visibility
              </div>
              <div className="mt-5 space-y-4">
                <InputField
                  label="Product tags"
                  helper="Use hashtag-style chips for search, promo themes, and future mobile app product filters."
                >
                  <TagInput tags={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} suggestions={tagSuggestions} />
                </InputField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-200">
                    <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
                    Mark as featured
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-slate-200">
                    <input type="checkbox" checked={form.bundleEligible} onChange={(event) => setForm((current) => ({ ...current, bundleEligible: event.target.checked }))} />
                    Eligible for bundle discounts
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                <PackageSearch size={16} className="text-cyan-300" />
                Pricing and media
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputField label="Stock">
                  <input type="number" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} placeholder="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Selling price">
                  <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="9999" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Cost price">
                  <input type="number" value={form.costPrice} onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))} placeholder="6500" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Compare-at price">
                  <input type="number" value={form.compareAtPrice} onChange={(event) => setForm((current) => ({ ...current, compareAtPrice: event.target.value }))} placeholder="10999" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Rating" helper="Shown on the storefront product card and product page.">
                  <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} placeholder="4.8" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Review count">
                  <input type="number" min="0" value={form.reviewCount} onChange={(event) => setForm((current) => ({ ...current, reviewCount: event.target.value }))} placeholder="241" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Sold total">
                  <input type="number" min="0" value={form.soldCount} onChange={(event) => setForm((current) => ({ ...current, soldCount: event.target.value }))} placeholder="241" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Sold today (manual)" helper="Adds on top of the real last-24h order sales.">
                  <input type="number" min="0" value={form.manualRecentSales24h} onChange={(event) => setForm((current) => ({ ...current, manualRecentSales24h: event.target.value }))} placeholder="12" className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
              </div>

              <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Product images</p>
                      <p className="text-xs text-slate-400">Upload multiple images, reorder them, and set alt text before saving.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <ImagePlus size={16} />
                      {uploadingImages ? "Uploading..." : "Add images"}
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>

                  {form.images.length ? (
                    <div className="grid gap-4 2xl:grid-cols-2">
                      {form.images.map((image, index) => (
                        <div key={`${image.url}-${index}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                          <img src={image.url} alt={image.alt || form.name || `Image ${index + 1}`} className="h-56 w-full bg-slate-950/30 object-scale-down" />
                          <div className="space-y-3 p-3">
                            <input
                              value={image.alt}
                              onChange={(event) => updateImageAlt(index, event.target.value)}
                              placeholder={`Image ${index + 1} alt text`}
                              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => moveImage(index, "left")} disabled={index === 0} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">
                                <ArrowLeft size={14} className="inline" /> Move left
                              </button>
                              <button type="button" onClick={() => moveImage(index, "right")} disabled={index === form.images.length - 1} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">
                                Move right <ArrowRight size={14} className="inline" />
                              </button>
                              <button type="button" onClick={() => removeImage(index)} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                                <Trash2 size={14} className="inline" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
                      Upload product images to preview them here.
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Product video</p>
                      <p className="text-xs text-slate-400">Optional. One short video, max 30 seconds and 20MB.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <Video size={16} />
                      {uploadingVideo ? "Uploading..." : form.video ? "Replace video" : "Add video"}
                      <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  </div>

                  {form.video ? (
                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                      <video src={form.video.url} poster={form.video.poster || form.images[0]?.url || ""} controls className="h-56 w-full bg-slate-950 object-contain" />
                      <div className="flex items-center justify-between gap-3 p-3 text-xs text-slate-300">
                        <span>{Number(form.video.durationSeconds || 0).toFixed(1)}s</span>
                        <span>{Math.round((Number(form.video.sizeBytes || 0) / 1024 / 1024) * 10) / 10}MB</span>
                        <button type="button" onClick={clearVideo} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-rose-200">
                          Remove video
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-500">
                      Upload one short product video for the gallery.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-slate-400">
                <Boxes size={16} className="text-emerald-300" />
                Variants and attributes
              </div>
              <div className="mt-5 grid gap-4">
                <InputField label="Variants" helper="Format: Name|Color|Storage|Model|Price|Stock|SKU|true">
                  <textarea rows={6} value={form.variantsText} onChange={(event) => setForm((current) => ({ ...current, variantsText: event.target.value }))} placeholder={"Base Model|Black|128GB|2025|9999|5|SKU-1|true\nPro Model|Blue|256GB|2025|12999|3|SKU-2|false"} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <InputField label="Attributes" helper="Format: Label|Value">
                  <textarea rows={5} value={form.attributesText} onChange={(event) => setForm((current) => ({ ...current, attributesText: event.target.value }))} placeholder={"Processor|Intel i5\nBattery|5000mAh\nDisplay|14-inch IPS"} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-brand-600">
              {isEditing ? "Update product" : "Create product"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setEditingId("");
                  setForm(initialForm);
                }}
                className="rounded-2xl border border-white/10 px-5 py-3 text-slate-200 transition duration-300 hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.form>

        <motion.section layout className={`${catalogPanelClasses} glass-panel overflow-hidden rounded-[32px] p-6 shadow-ambient`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Catalog</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Admin inventory and seller review queue</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {adminManagedProducts.length} admin listing{adminManagedProducts.length === 1 ? "" : "s"} • {sellerReviewProducts.length} seller review{sellerReviewProducts.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Admin inventory</p>
                <p className="mt-2 text-2xl font-semibold text-white">{adminManagedProducts.length}</p>
                <p className="mt-2 text-sm text-slate-300">Only admin-owned products stay editable here.</p>
              </div>
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Seller review queue</p>
                <p className="mt-2 text-2xl font-semibold text-amber-50">{sellerReviewProducts.length}</p>
                <p className="mt-2 text-sm text-amber-50/80">Approved seller products leave this queue automatically and can no longer be edited by admin.</p>
              </div>
            </div>

            {sellerReviewProducts.length ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Seller review queue</p>
                  <p className="mt-2 text-sm text-slate-300">Review pending or rejected seller listings here. Once approved, they disappear from this queue and stay under seller ownership.</p>
                </div>
                <AnimatePresence initial={false}>
                  {sellerReviewProducts.map((product, index) => (
                    <motion.div
                      key={`seller-${product._id}`}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="rounded-[28px] border border-amber-400/20 bg-amber-500/5 p-4 transition duration-300 hover:-translate-y-1 hover:border-amber-400/30 sm:p-5"
                    >
                      <div className="grid gap-4 sm:grid-cols-[104px_minmax(0,1fr)]">
                        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/30">
                          <img src={withAbsoluteUrl(product.images?.[0]?.url)} alt={product.name} className="h-40 w-full bg-slate-950/30 object-scale-down sm:h-full sm:min-h-[136px]" />
                        </div>
                        <div className="flex min-w-0 flex-col gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start gap-2">
                              <p className="break-words font-semibold text-white">{product.name}</p>
                              {product.video?.url && <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">Video</span>}
                            </div>
                            <p className="mt-1 text-sm text-slate-400">{product.category} • {product.condition || "Affordable tech"}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Seller listing</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{product.approvalStatus || "pending"}</span>
                              {product.owner?.sellerProfile?.storeName ? (
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">{product.owner.sellerProfile.storeName}</span>
                              ) : null}
                            </div>
                            <div className="mt-3 grid gap-2 rounded-[24px] border border-white/10 bg-slate-950/20 p-3 text-sm text-slate-300 sm:grid-cols-3">
                              <span>{peso(product.price)}</span>
                              <span>Stock {product.stock}</span>
                              <span>{product.variants?.length || 0} variants</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:col-start-2 sm:flex-row">
                          <button onClick={() => handleReviewProduct(product._id, "approved")} className="flex-1 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 transition duration-300 hover:bg-emerald-500/25">
                            Approve
                          </button>
                          <button onClick={() => handleReviewProduct(product._id, "rejected")} className="flex-1 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-100 transition duration-300 hover:bg-amber-500/25">
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled
                            className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400 opacity-60"
                          >
                            Review only
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : null}

            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Admin inventory</p>
              <p className="mt-2 text-sm text-slate-300">Your own store products stay editable here. Seller products are intentionally excluded once approved.</p>
            </div>
            <AnimatePresence initial={false}>
              {adminManagedProducts.map((product, index) => (
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-500/25 sm:p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-[104px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/30">
                      <img src={withAbsoluteUrl(product.images?.[0]?.url)} alt={product.name} className="h-40 w-full bg-slate-950/30 object-scale-down sm:h-full sm:min-h-[136px]" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start gap-2">
                          <p className="break-words font-semibold text-white">{product.name}</p>
                          {product.featured && <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-brand-50">Featured</span>}
                          {product.video?.url && <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">Video</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{product.category} • {product.condition || "Affordable tech"}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Admin listing</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {product.approvalStatus || "approved"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          {(product.tags || []).slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 rounded-[24px] border border-white/10 bg-slate-950/20 p-3 text-sm text-slate-300 sm:grid-cols-3">
                          <span>{peso(product.price)}</span>
                          <span>Stock {product.stock}</span>
                          <span>{product.variants?.length || 0} variants</span>
                        </div>
                        <div className="mt-3 grid gap-2 rounded-[24px] border border-white/10 bg-slate-950/20 p-3 text-sm text-slate-300 sm:grid-cols-4">
                          <span>Rating {Number(product.rating || 0).toFixed(1)}</span>
                          <span>Reviews {product.reviewCount || 0}</span>
                          <span>Sold {product.soldCount || 0}</span>
                          <span>Today {product.recentSales24h || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:col-start-2 sm:flex-row">
                      <button onClick={() => beginEdit(product)} className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-100 transition duration-300 hover:bg-white/20">Edit</button>
                      <button onClick={() => handleDelete(product._id)} className="flex-1 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200 transition duration-300 hover:bg-rose-500/25">Delete</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!adminManagedProducts.length && !sellerReviewProducts.length && (
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-slate-300">
                No products yet. Add your first gadget to start building the catalog.
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}




