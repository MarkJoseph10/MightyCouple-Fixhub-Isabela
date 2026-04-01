import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  CopyPlus,
  ImagePlus,
  Info,
  LayoutTemplate,
  PackageSearch,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import TagInput from "../../components/admin/TagInput";
import { peso } from "../../utils/commerce";
import { resolveMediaUrl } from "../../utils/media";

const mediaBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");
const maxVideoSizeBytes = 20 * 1024 * 1024;
const maxVideoDurationSeconds = 30;

const fallbackTagSuggestions = [
  "#trending",
  "#budgettech",
  "#smartphone",
  "#gadgetfinds",
  "#sellerpick",
  "#bestseller",
  "#hotdeal",
  "#newarrival"
];

const categoryOptions = ["Phones", "Laptops", "Accessories", "Wearables", "Audio", "Gaming", "Cameras", "Tablets"];

const initialVariant = {
  name: "",
  color: "",
  storage: "",
  model: "",
  price: 0,
  stock: 0,
  sku: "",
  isDefault: false
};

const initialAttribute = {
  label: "",
  value: ""
};

const initialForm = {
  name: "",
  shortDescription: "",
  description: "",
  category: "Phones",
  condition: "Brand new",
  popularityLabel: "Seller fresh drop",
  price: 0,
  compareAtPrice: 0,
  costPrice: 0,
  stock: 0,
  sku: "",
  tags: [],
  images: [],
  video: null,
  variants: [],
  attributes: [initialAttribute],
  featured: false,
  bundleEligible: true
};

function withAbsoluteUrl(url = "") {
  return resolveMediaUrl(url);
}

function buildFallbackTagSuggestions(products = []) {
  const counts = new Map();

  products.forEach((product) => {
    (product.tags || []).forEach((tag) => {
      counts.set(tag, Number(counts.get(tag) || 0) + 1);
    });
  });

  const ranked = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag, count]) => ({
      tag,
      count,
      trending: count > 1
    }));

  fallbackTagSuggestions.forEach((tag) => {
    if (!ranked.some((entry) => entry.tag === tag)) {
      ranked.push({ tag, count: 0, trending: true });
    }
  });

  return ranked.slice(0, 12);
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

function InputField({ label, helper, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</span>
      {children}
      {helper ? <span className="text-xs leading-6 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="glass-panel rounded-[28px] p-5 shadow-ambient sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-100">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
          </div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusPill({ status = "pending" }) {
  const palette = {
    approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    pending: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    rejected: "border-rose-400/20 bg-rose-500/10 text-rose-100"
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${palette[status] || palette.pending}`}>
      {status}
    </span>
  );
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const hasVariants = useMemo(
    () => form.variants.some((variant) => variant.name || variant.sku || variant.color || variant.storage || variant.model),
    [form.variants]
  );
  const productApprovalCounts = useMemo(
    () =>
      products.reduce(
        (totals, product) => {
          totals.total += 1;
          totals[product.approvalStatus || "pending"] += 1;
          return totals;
        },
        { total: 0, pending: 0, approved: 0, rejected: 0 }
      ),
    [products]
  );
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.category, product.sku, product.shortDescription, ...(product.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    ).filter((product) => statusFilter === "all" || (product.approvalStatus || "pending") === statusFilter);
  }, [products, searchQuery, statusFilter]);

  useEffect(() => {
    async function loadPageData() {
      try {
        const [sellerProductsResponse, tagResponse] = await Promise.allSettled([
          api.get("/products/seller/mine"),
          api.get("/products/tags/suggestions")
        ]);

        if (sellerProductsResponse.status === "fulfilled") {
          setProducts(sellerProductsResponse.value.data);
        } else {
          throw sellerProductsResponse.reason;
        }

        if (tagResponse.status === "fulfilled") {
          setTagSuggestions(tagResponse.value.data);
        } else {
          setTagSuggestions(buildFallbackTagSuggestions(sellerProductsResponse.value.data));
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load seller products.");
      }
    }

    loadPageData();
  }, []);

  useEffect(() => {
    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        refreshProducts().catch(() => {});
      }
    }

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId("");
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function loadProductIntoForm(product) {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      category: product.category || "Phones",
      condition: product.condition || "Brand new",
      popularityLabel: product.popularityLabel || "Seller fresh drop",
      price: Number(product.price || 0),
      compareAtPrice: Number(product.compareAtPrice || 0),
      costPrice: Number(product.costPrice || 0),
      stock: Number(product.stock || 0),
      sku: product.sku || "",
      tags: product.tags || [],
      images: (product.images || []).map((image) => ({
        url: withAbsoluteUrl(image.url),
        alt: image.alt || product.name || "Product image"
      })),
      video: product.video?.url
        ? {
            url: withAbsoluteUrl(product.video.url),
            poster: withAbsoluteUrl(product.video.poster),
            durationSeconds: Number(product.video.durationSeconds || 0),
            sizeBytes: Number(product.video.sizeBytes || 0),
            mimeType: product.video.mimeType || ""
          }
        : null,
      variants: (product.variants || []).length
        ? product.variants.map((variant, index) => ({
            ...initialVariant,
            ...variant,
            price: Number(variant.price || 0),
            stock: Number(variant.stock || 0),
            isDefault: Boolean(variant.isDefault || index === 0)
          }))
        : [],
      attributes: (product.attributes || []).length ? product.attributes : [initialAttribute],
      featured: Boolean(product.featured),
      bundleEligible: Boolean(product.bundleEligible)
    });
    setStatus(`Editing ${product.name}. Saving again will send it back to admin review.`);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshProducts() {
    const { data } = await api.get("/products/seller/mine");
    setProducts(data);

    try {
      const tagsResponse = await api.get("/products/tags/suggestions");
      setTagSuggestions(tagsResponse.data);
    } catch {
      setTagSuggestions(buildFallbackTagSuggestions(data));
    }
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setUploadingImages(true);
    setError("");
    setStatus("");

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
      setError(requestError.response?.data?.message || "Unable to upload images.");
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
    setError("");
    setStatus("");

    try {
      if (!file.type.startsWith("video/")) {
        throw new Error("Only video files are allowed.");
      }

      if (file.size > maxVideoSizeBytes) {
        throw new Error("Video must be 20MB or smaller.");
      }

      const durationSeconds = await getVideoDuration(file);

      if (durationSeconds > maxVideoDurationSeconds) {
        throw new Error("Video must be 30 seconds or shorter.");
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
      setStatus("Video uploaded successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to upload video.");
    } finally {
      event.target.value = "";
      setUploadingVideo(false);
    }
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          ...initialVariant,
          isDefault: current.variants.length === 0
        }
      ]
    }));
  }

  function updateVariant(index, field, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          return variant;
        }

        return {
          ...variant,
          [field]: value
        };
      })
    }));
  }

  function removeVariant(index) {
    setForm((current) => {
      const nextVariants = current.variants.filter((_, variantIndex) => variantIndex !== index);
      const defaultIndex = nextVariants.findIndex((variant) => variant.isDefault);

      return {
        ...current,
        variants: nextVariants.map((variant, variantIndex) => ({
          ...variant,
          isDefault: defaultIndex === -1 ? variantIndex === 0 : variantIndex === defaultIndex
        }))
      };
    });
  }

  function setDefaultVariant(index) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => ({
        ...variant,
        isDefault: variantIndex === index
      }))
    }));
  }

  function addAttribute() {
    setForm((current) => ({
      ...current,
      attributes: [...current.attributes, initialAttribute]
    }));
  }

  function updateAttribute(index, field, value) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute
      )
    }));
  }

  function removeAttribute(index) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.length === 1 ? [initialAttribute] : current.attributes.filter((_, attributeIndex) => attributeIndex !== index)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      if (!form.images.length) {
        throw new Error("Please upload at least one product image.");
      }

      const payload = {
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category,
        condition: form.condition,
        popularityLabel: form.popularityLabel,
        price: Number(form.price || 0),
        compareAtPrice: Number(form.compareAtPrice || 0),
        costPrice: Number(form.costPrice || 0),
        stock: Number(form.stock || 0),
        sku: form.sku,
        tags: form.tags,
        images: form.images.map((image) => ({
          url: image.url.replace(mediaBaseUrl, ""),
          alt: image.alt
        })),
        video: form.video?.url
          ? {
              url: form.video.url.replace(mediaBaseUrl, ""),
              poster: form.video.poster ? form.video.poster.replace(mediaBaseUrl, "") : "",
              durationSeconds: form.video.durationSeconds,
              sizeBytes: form.video.sizeBytes,
              mimeType: form.video.mimeType
            }
          : null,
        variants: form.variants
          .filter((variant) => variant.name || variant.color || variant.storage || variant.model || variant.sku)
          .map((variant) => ({
            name: variant.name,
            color: variant.color,
            storage: variant.storage,
            model: variant.model,
            price: Number(variant.price || 0),
            stock: Number(variant.stock || 0),
            sku: variant.sku,
            isDefault: Boolean(variant.isDefault)
          })),
        attributes: form.attributes.filter((attribute) => attribute.label && attribute.value),
        featured: false,
        bundleEligible: false
      };

      if (isEditing) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post("/products", payload);
      }

      await refreshProducts();
      resetForm();
      setStatus(isEditing ? "Product updated and resubmitted for admin approval." : "Product submitted successfully. Admin approval is required before it goes live.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to save product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(productId) {
    if (!window.confirm("Delete this seller listing? This cannot be undone.")) {
      return;
    }

    try {
      setError("");
      setStatus("");
      await api.delete(`/products/${productId}`);
      await refreshProducts();

      if (editingId === productId) {
        resetForm();
      }

      setStatus("Product removed from your seller catalog.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="glass-panel rounded-[32px] p-6 shadow-ambient sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Seller catalog editor</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">List gadgets with cleaner media, tags, and variants</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              This editor is organized for seller use: upload product media directly, add hashtag-style tags, build variants, and send every listing through admin review.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Your listings</p>
              <p className="mt-2 text-3xl font-semibold text-white">{productApprovalCounts.total}</p>
            </div>
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-100/70">Pending</p>
              <p className="mt-2 text-3xl font-semibold text-amber-50">{productApprovalCounts.pending}</p>
            </div>
            <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/70">Approved</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-50">{productApprovalCounts.approved}</p>
            </div>
          </div>
        </div>
      </section>

      {status ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{status}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <SectionCard
            icon={LayoutTemplate}
            title="Basics"
            description="Start with the information every buyer sees first: the product name, summary, category, and your main listing message."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField label="Product name" helper="Keep this clear and searchable, like brand + model + key version.">
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Example: Nova X Pro Smartphone 256GB"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                  />
                </InputField>
              </div>

              <div className="md:col-span-2">
                <InputField label="Short description" helper="This appears in cards and quick previews. Keep it short and persuasive.">
                  <input
                    value={form.shortDescription}
                    onChange={(event) => updateField("shortDescription", event.target.value)}
                    placeholder="Flagship battery life with bright OLED display"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                  />
                </InputField>
              </div>

              <div className="md:col-span-2">
                <InputField label="Full description" helper="Write the key specs, condition, inclusions, and what makes this product a good buy.">
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Describe the product condition, included accessories, battery health, warranty, and target buyer."
                    className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                  />
                </InputField>
              </div>

              <InputField label="Category">
                <select
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </InputField>

              <InputField label="Condition" helper="Examples: Brand new, Open box, Lightly used, Budget friendly.">
                <input
                  value={form.condition}
                  onChange={(event) => updateField("condition", event.target.value)}
                  placeholder="Brand new"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>

              <InputField label="Storefront badge" helper="A short badge shown in the catalog, like Everyday essential or Hot add-on.">
                <input
                  value={form.popularityLabel}
                  onChange={(event) => updateField("popularityLabel", event.target.value)}
                  placeholder="Hot add-on"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>

              <InputField label="Seller SKU" helper="Use your own tracking code so you can match orders to your stock.">
                <input
                  value={form.sku}
                  onChange={(event) => updateField("sku", event.target.value)}
                  placeholder="SELLER-NOVA-256"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>
            </div>
          </SectionCard>

          <SectionCard
            icon={Sparkles}
            title="Pricing and stock"
            description="Organized pricing makes approvals faster. Set your live selling price, optional compare price, cost for your own tracking, and inventory count."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <InputField label="Selling price" helper="This is the price buyers will pay on the storefront.">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>

              <InputField label="Compare-at price" helper="Optional original price to show a markdown or discount.">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.compareAtPrice}
                  onChange={(event) => updateField("compareAtPrice", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>

              <InputField label="Your cost" helper="Private reference only. This helps you track margin before platform commission.">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.costPrice}
                  onChange={(event) => updateField("costPrice", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>

              <InputField
                label={hasVariants ? "Fallback stock" : "Available stock"}
                helper={hasVariants ? "When variants are present, stock is computed from variant stock below." : "Set the number of pieces you can actually fulfill right now."}
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </InputField>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">Platform commission</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-50">10%</p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/80">The admin store keeps a fixed 10% commission from each completed seller sale.</p>
              </div>
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-amber-100/70">Approval flow</p>
                <p className="mt-2 text-lg font-semibold text-amber-50">Admin review required</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/80">Every new or edited seller listing goes back to pending review before it can show live.</p>
              </div>
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-rose-100/70">Installment rule</p>
                <p className="mt-2 text-lg font-semibold text-rose-50">Disabled for seller items</p>
                <p className="mt-2 text-sm leading-6 text-rose-100/80">Seller listings are checkout-ready for full payment only. Installment remains reserved for admin-owned items.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={ImagePlus}
            title="Media studio"
            description="Upload multiple product photos and one short video. Buyers respond better when they can see several angles, packaging, and real condition shots."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-dashed border-white/15 bg-slate-950/30 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Upload product images</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">Use clear front, side, and detail shots. Multiple images are supported.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600">
                      <Upload size={16} />
                      {uploadingImages ? "Uploading..." : "Add images"}
                      <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {form.images.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {form.images.map((image, index) => (
                      <div key={`${image.url}-${index}`} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-950/40">
                          <img src={image.url} alt={image.alt} className="h-full w-full object-contain p-3" />
                        </div>
                        <div className="space-y-3 p-4">
                          <input
                            value={image.alt}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                images: current.images.map((entry, imageIndex) =>
                                  imageIndex === index ? { ...entry, alt: event.target.value } : entry
                                )
                              }))
                            }
                            placeholder="Alt text / image note"
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => setForm((current) => ({ ...current, images: swapItems(current.images, index, index - 1) }))}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowLeft size={14} />
                              Move left
                            </button>
                            <button
                              type="button"
                              disabled={index === form.images.length - 1}
                              onClick={() => setForm((current) => ({ ...current, images: swapItems(current.images, index, index + 1) }))}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Move right
                              <ArrowRight size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  images: current.images.filter((_, imageIndex) => imageIndex !== index)
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                    No images yet. Upload at least one image before submitting this listing.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-dashed border-white/15 bg-slate-950/30 p-5">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-slate-200">
                      <Video size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Optional short video</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">One short video only, maximum 30 seconds and 20MB.</p>
                    </div>
                  </div>
                  <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10">
                    <Upload size={16} />
                    {uploadingVideo ? "Uploading..." : form.video ? "Replace video" : "Upload video"}
                    <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                  </label>
                </div>

                {form.video ? (
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                    <div className="aspect-video bg-slate-950/40">
                      <video src={form.video.url} poster={form.video.poster || undefined} controls className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-sm text-slate-300">
                        {Math.round(Number(form.video.durationSeconds || 0))} sec | {(Number(form.video.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, video: null }))}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
                      >
                        <Trash2 size={14} />
                        Remove video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                    Video is optional, but it helps buyers trust your listing.
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Tag}
            title="Tags and discoverability"
            description="Use hashtag-style tags to help your listing appear in search and category discovery. Press Enter, Tab, or comma to separate tags."
          >
            <TagInput tags={form.tags} onChange={(nextTags) => updateField("tags", nextTags)} suggestions={tagSuggestions} />
          </SectionCard>

          <SectionCard
            icon={Boxes}
            title="Variants"
            description="Add variations like color, storage, bundle, or model. When variants exist, total stock is automatically based on the sum of variant stock."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Variant builder</p>
                  <p className="mt-1 text-sm text-slate-400">Examples: 128GB Blue, 256GB Black, With charger bundle.</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
                >
                  <Plus size={16} />
                  Add variant
                </button>
              </div>

              <AnimatePresence initial={false}>
                {form.variants.map((variant, index) => (
                  <motion.div
                    key={`variant-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-[28px] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Variant {index + 1}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{variant.isDefault ? "Default purchase option" : "Optional selection"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDefaultVariant(index)}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs ${variant.isDefault ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border border-white/10 bg-white/5 text-slate-200"}`}
                        >
                          <CheckCircle2 size={14} />
                          Default
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InputField label="Variant name">
                        <input
                          value={variant.name}
                          onChange={(event) => updateVariant(index, "name", event.target.value)}
                          placeholder="256GB Black"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Color">
                        <input
                          value={variant.color}
                          onChange={(event) => updateVariant(index, "color", event.target.value)}
                          placeholder="Black"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Storage">
                        <input
                          value={variant.storage}
                          onChange={(event) => updateVariant(index, "storage", event.target.value)}
                          placeholder="256GB"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Model">
                        <input
                          value={variant.model}
                          onChange={(event) => updateVariant(index, "model", event.target.value)}
                          placeholder="Nova X Pro"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Variant price">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.price}
                          onChange={(event) => updateVariant(index, "price", event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Variant stock">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stock}
                          onChange={(event) => updateVariant(index, "stock", event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                      <InputField label="Variant SKU" helper="Optional, but recommended if this variant has separate stock tracking.">
                        <input
                          value={variant.sku}
                          onChange={(event) => updateVariant(index, "sku", event.target.value)}
                          placeholder="SELLER-NOVA-256-BLK"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-white outline-none"
                        />
                      </InputField>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!form.variants.length ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No variants yet. Use this if your product comes in different colors, capacities, bundles, or configurations.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            icon={CopyPlus}
            title="Specifications and buyer notes"
            description="Add clean spec rows so customers can quickly understand battery, warranty, inclusions, compatibility, or condition notes."
          >
            <div className="space-y-4">
              {form.attributes.map((attribute, index) => (
                <div key={`attribute-${index}`} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    value={attribute.label}
                    onChange={(event) => updateAttribute(index, "label", event.target.value)}
                    placeholder="Battery"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 text-white outline-none"
                  />
                  <input
                    value={attribute.value}
                    onChange={(event) => updateAttribute(index, "value", event.target.value)}
                    placeholder="5000mAh"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttribute(index)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAttribute}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <Plus size={16} />
                Add specification row
              </button>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[28px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-1 text-cyan-200" />
              <div className="text-sm leading-7 text-slate-300">
                Save sends this product to admin review. If the product gets rejected, you can edit it here, improve the listing, and submit again.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting || uploadingImages || uploadingVideo}
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : isEditing ? "Update and resubmit" : "Submit seller product"}
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-5">
          <SectionCard
            icon={PackageSearch}
            title="My listings"
            description="Track the review status of your products. Rejected items stay here with admin notes so you can improve and resubmit them."
          >
            <div className="rounded-[24px] border border-white/10 bg-slate-950/30 p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <PackageSearch size={16} className="text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by product name, SKU, or tag"
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: `All (${productApprovalCounts.total})` },
                  { key: "pending", label: `Pending (${productApprovalCounts.pending})` },
                  { key: "approved", label: `Approved (${productApprovalCounts.approved})` },
                  { key: "rejected", label: `Rejected (${productApprovalCounts.rejected})` }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      statusFilter === filter.key
                        ? "bg-cyan-500/15 text-cyan-50 border border-cyan-400/30"
                        : "bg-white/5 text-slate-300 border border-white/10"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <div key={product._id} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                    <div className="grid gap-0 md:grid-cols-[140px_minmax(0,1fr)]">
                      <div className="aspect-[4/3] overflow-hidden bg-slate-950/40 md:aspect-auto">
                        {product.images?.[0]?.url ? (
                          <img src={withAbsoluteUrl(product.images[0].url)} alt={product.name} className="h-full w-full object-contain p-4" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-500">
                            <ImagePlus size={28} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-lg font-semibold text-white">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{product.category} | {product.sku || "No SKU yet"}</p>
                          </div>
                          <StatusPill status={product.approvalStatus || "pending"} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selling price</p>
                            <p className="mt-1 font-semibold text-white">{peso(product.price)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Stock</p>
                            <p className="mt-1 font-semibold text-white">{product.stock}</p>
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-300">
                          {product.approvalStatus === "approved"
                            ? "Approved and live on the storefront."
                            : product.approvalStatus === "rejected"
                              ? "Rejected for now. Edit the listing, fix the issue, then resubmit."
                              : "Pending admin review. This listing is not live yet."}
                        </div>

                        <div className="rounded-[20px] border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                          <div className="flex flex-wrap items-center gap-3">
                            <span>Storefront visibility:</span>
                            <span className={product.approvalStatus === "approved" ? "text-emerald-200" : "text-amber-100"}>
                              {product.approvalStatus === "approved" ? "Live" : "Hidden until approval"}
                            </span>
                            {product.approvedAt ? <span className="text-slate-400">Approved on {new Date(product.approvedAt).toLocaleString()}</span> : null}
                          </div>
                        </div>

                        {product.approvalNote ? (
                          <div className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-3 text-sm leading-6 text-rose-100">
                            <div className="mb-1 flex items-center gap-2 font-medium">
                              <AlertTriangle size={15} />
                              Admin note
                            </div>
                            {product.approvalNote}
                          </div>
                        ) : null}

                        {(product.tags || []).length ? (
                          <div className="flex flex-wrap gap-2">
                            {(product.tags || []).slice(0, 5).map((tagValue) => (
                              <span key={tagValue} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {tagValue}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => loadProductIntoForm(product)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                          >
                            <Sparkles size={16} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product._id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No seller listings matched your search.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
