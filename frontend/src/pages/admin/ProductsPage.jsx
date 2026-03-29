import { AnimatePresence, motion } from "framer-motion";
import { Boxes, ImagePlus, PackageSearch, Sparkles, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import TagInput from "../../components/admin/TagInput";
import api from "../../api/client";
import { peso } from "../../utils/commerce";

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
  imageUrl: "",
  featured: false,
  bundleEligible: true,
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

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("editor");

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

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
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      const payload = new FormData();
      payload.append("image", file);

      const { data } = await api.post("/uploads", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setForm((current) => ({
        ...current,
        imageUrl: `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${data.imageUrl}`
      }));
      setStatus("Image uploaded successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload image.");
    } finally {
      setUploading(false);
    }
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
      tags: form.tags,
      images: form.imageUrl ? [{ url: form.imageUrl, alt: form.name }] : [],
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

  function beginEdit(product) {
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
      imageUrl: product.images?.[0]?.url || "",
      featured: Boolean(product.featured),
      bundleEligible: product.bundleEligible !== false,
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
          <h1 className="mt-2 text-4xl font-semibold text-white">Smart catalog editor</h1>
        </div>
        <div className="rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-50">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
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
                <InputField label="Image URL" helper="You can paste an image URL or upload one below.">
                  <input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none" />
                </InputField>
                <div className="space-y-3 rounded-[28px] border border-dashed border-white/10 bg-slate-950/20 p-4">
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    <span>{uploading ? "Uploading..." : "Upload product image"}</span>
                    <ImagePlus size={16} />
                    <input type="file" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt={form.name || "Product preview"} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-slate-500">Image preview will appear here</div>
                    )}
                  </div>
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

        <motion.section layout className={`${catalogPanelClasses} glass-panel rounded-[32px] p-6 shadow-ambient`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Catalog</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Live product inventory</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {products.length} active listing{products.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {products.map((product, index) => (
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <img src={product.images?.[0]?.url} alt={product.name} className="h-24 w-24 rounded-2xl object-cover" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-white">{product.name}</p>
                          {product.featured && <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-brand-50">Featured</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{product.category} • {product.condition || "Affordable tech"}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          {(product.tags || []).slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                          <span>{peso(product.price)}</span>
                          <span>Stock {product.stock}</span>
                          <span>{product.variants?.length || 0} variants</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => beginEdit(product)} className="rounded-2xl bg-white/10 px-4 py-2 text-sm text-slate-100 transition duration-300 hover:bg-white/20">Edit</button>
                      <button onClick={() => handleDelete(product._id)} className="rounded-2xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200 transition duration-300 hover:bg-rose-500/25">Delete</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!products.length && (
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
