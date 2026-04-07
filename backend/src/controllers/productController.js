import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { createSlug } from "../utils/createSlug.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function buildProductFilters(query) {
  const filters = {
    status: "active",
    approvalStatus: { $in: ["approved", null] }
  };

  if (query.category && query.category !== "All") {
    filters.category = query.category;
  }

  if (query.condition && query.condition !== "All") {
    filters.condition = query.condition;
  }

  if (query.search) {
    filters.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { shortDescription: { $regex: query.search, $options: "i" } },
      { tags: { $regex: query.search, $options: "i" } },
      { popularityLabel: { $regex: query.search, $options: "i" } }
    ];
  }

  if (query.featured === "true") {
    filters.featured = true;
  }

  if (query.minPrice || query.maxPrice) {
    filters.price = {};

    if (query.minPrice !== undefined) {
      filters.price.$gte = Number(query.minPrice || 0);
    }

    if (query.maxPrice !== undefined) {
      filters.price.$lte = Number(query.maxPrice || 0);
    }
  }

  return filters;
}

function resolveSort(sortKey) {
  switch (sortKey) {
    case "price-asc":
      return { price: 1, createdAt: -1 };
    case "price-desc":
      return { price: -1, createdAt: -1 };
    case "rating":
      return { rating: -1, soldCount: -1, createdAt: -1 };
    case "popular":
      return { soldCount: -1, rating: -1, viewsCount: -1 };
    default:
      return { featured: -1, soldCount: -1, rating: -1, createdAt: -1 };
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumber(value, fallback = 0) {
  return Math.max(0, toNumber(value, fallback));
}

function normalizeTags(tags) {
  const rawTags = Array.isArray(tags) ? tags : String(tags || "").split(",");
  const seen = new Set();

  return rawTags
    .map((tag) => String(tag).trim().toLowerCase())
    .map((tag) => tag.replace(/^#+/, "").replace(/\s+/g, "-"))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .filter((tag) => {
      if (seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}

const fallbackSuggestedTags = [
  "#trending",
  "#budgettech",
  "#smartphone",
  "#laptopdeal",
  "#gadgetfinds",
  "#techsale",
  "#musthave",
  "#onhandph"
];

function normalizeAttributes(attributes = []) {
  if (!Array.isArray(attributes)) {
    return [];
  }

  return attributes
    .map((attribute) => ({
      label: String(attribute.label || "").trim(),
      value: String(attribute.value || "").trim()
    }))
    .filter((attribute) => attribute.label && attribute.value);
}

function normalizeVariants(variants = []) {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map((variant, index) => ({
      name: String(variant.name || "").trim(),
      color: String(variant.color || "").trim(),
      storage: String(variant.storage || "").trim(),
      model: String(variant.model || "").trim(),
      sku: String(variant.sku || "").trim(),
      price: toNumber(variant.price, 0),
      stock: toNumber(variant.stock, 0),
      isDefault: Boolean(variant.isDefault || index === 0),
      _id: variant._id
    }))
    .filter((variant) => variant.name || variant.color || variant.storage || variant.model || variant.sku);
}

function normalizeImages(images = [], productName = "") {
  if (!Array.isArray(images)) {
    return [];
  }

  const seen = new Set();

  return images
    .map((image) => ({
      url: String(image?.url || "").trim(),
      alt: String(image?.alt || productName || "Product image").trim()
    }))
    .filter((image) => image.url)
    .filter((image) => {
      if (seen.has(image.url)) {
        return false;
      }

      seen.add(image.url);
      return true;
    });
}

function normalizeVideo(video, fallbackPoster = "") {
  if (!video || typeof video !== "object") {
    return undefined;
  }

  const url = String(video.url || "").trim();

  if (!url) {
    return undefined;
  }

  return {
    url,
    poster: String(video.poster || fallbackPoster || "").trim(),
    durationSeconds: toPositiveNumber(video.durationSeconds, 0),
    sizeBytes: toPositiveNumber(video.sizeBytes, 0),
    mimeType: String(video.mimeType || "").trim()
  };
}

async function ensureUniqueSlug(name, excludeId) {
  const baseSlug = createSlug(name);
  let slug = baseSlug;
  let counter = 2;

  while (
    await Product.exists({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

function prepareProductPayload(body) {
  const variants = normalizeVariants(body.variants);
  const manualStock = toNumber(body.stock, 0);
  const variantStockTotal = variants.reduce((sum, variant) => sum + toNumber(variant.stock, 0), 0);
  const hasMeaningfulVariantStock = variants.some((variant) => toNumber(variant.stock, 0) > 0);
  const stock = variants.length && hasMeaningfulVariantStock ? variantStockTotal : manualStock;
  const name = String(body.name || "").trim();
  const images = normalizeImages(body.images, name);
  const video = normalizeVideo(body.video, images[0]?.url || "");

  return {
    name,
    shortDescription: String(body.shortDescription || "").trim(),
    description: String(body.description || "").trim(),
    category: String(body.category || "Gadgets").trim(),
    price: toNumber(body.price, 0),
    costPrice: toNumber(body.costPrice, 0),
    compareAtPrice: toNumber(body.compareAtPrice, 0),
    stock,
    sku: String(body.sku || "").trim(),
    featured: Boolean(body.featured),
    tags: normalizeTags(body.tags),
    images,
    video,
    attributes: normalizeAttributes(body.attributes),
    variants,
    bundleEligible: body.bundleEligible !== false,
    popularityLabel: String(body.popularityLabel || "").trim() || "Trending tech pick",
    condition: String(body.condition || "").trim() || "Affordable tech",
    status: body.status || "active",
    approvalStatus: body.approvalStatus || "approved",
    approvalNote: String(body.approvalNote || "").trim(),
    commissionRate: toPositiveNumber(body.commissionRate, 10),
    soldCount: toPositiveNumber(body.soldCount, 0),
    manualRecentSales24h: toPositiveNumber(body.manualRecentSales24h, 0),
    viewsCount: toPositiveNumber(body.viewsCount, 0),
    favoritesCount: toPositiveNumber(body.favoritesCount, 0),
    reviewCount: toPositiveNumber(body.reviewCount, 0),
    rating: Math.min(5, toPositiveNumber(body.rating, 0))
  };
}

async function getRecentSalesMap(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSales = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: productIds } } },
    {
      $group: {
        _id: "$items.product",
        quantity: { $sum: "$items.quantity" }
      }
    }
  ]);

  return new Map(recentSales.map((entry) => [entry._id.toString(), entry.quantity]));
}

function serializeProduct(product, recentSalesMap = new Map()) {
  const normalizedProduct = product.toObject ? product.toObject() : product;
  const variantPrices = (normalizedProduct.variants || [])
    .map((variant) => Number(variant.price || 0))
    .filter(Boolean);

  return {
    ...normalizedProduct,
    video: normalizedProduct.video?.url ? normalizedProduct.video : null,
    recentSales24h: (recentSalesMap.get(String(normalizedProduct._id)) || 0) + Number(normalizedProduct.manualRecentSales24h || 0),
    manualRecentSales24h: Number(normalizedProduct.manualRecentSales24h || 0),
    hasVariants: Boolean(normalizedProduct.variants?.length),
    priceFrom: variantPrices.length ? Math.min(...variantPrices) : normalizedProduct.price
  };
}

export const getProducts = asyncHandler(async (req, res) => {
  const filters = buildProductFilters(req.query);
  const products = await Product.find(filters).sort(resolveSort(req.query.sort));
  const recentSalesMap = await getRecentSalesMap(products.map((product) => product._id));

  res.json(products.map((product) => serializeProduct(product, recentSalesMap)));
});

export const getTagSuggestions = asyncHandler(async (_, res) => {
  const aggregatedTags = await Product.aggregate([
    {
      $project: {
        tags: 1,
        soldCount: { $ifNull: ["$soldCount", 0] },
        viewsCount: { $ifNull: ["$viewsCount", 0] }
      }
    },
    { $unwind: "$tags" },
    {
      $group: {
        _id: { $toLower: "$tags" },
        count: { $sum: 1 },
        soldCount: { $sum: "$soldCount" },
        viewsCount: { $sum: "$viewsCount" }
      }
    },
    { $sort: { count: -1, soldCount: -1, viewsCount: -1, _id: 1 } },
    { $limit: 16 }
  ]);

  const suggestions = aggregatedTags.map((item) => {
    const tag = normalizeTags([item._id])[0];

    return {
      tag,
      count: Number(item.count || 0),
      trending: Number(item.count || 0) > 1 || Number(item.soldCount || 0) >= 15 || Number(item.viewsCount || 0) >= 100
    };
  });

  fallbackSuggestedTags.forEach((tag) => {
    if (!suggestions.some((item) => item.tag === tag)) {
      suggestions.push({
        tag,
        count: 0,
        trending: true
      });
    }
  });

  res.json(suggestions.slice(0, 12));
});

export const getAdminProducts = asyncHandler(async (_, res) => {
  const products = await Product.find().sort({ createdAt: -1 }).populate("owner", "name email sellerProfile");
  res.json(products.map((product) => serializeProduct(product)));
});

export const getSellerProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ owner: req.user._id, vendorType: "seller" }).sort({ createdAt: -1 });
  res.json(products.map((product) => serializeProduct(product)));
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    {
      slug: req.params.slug,
      status: "active",
      approvalStatus: { $in: ["approved", null] }
    },
    { $inc: { viewsCount: 1 } },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const recentSalesMap = await getRecentSalesMap([product._id]);
  const relatedProducts = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    status: "active",
    approvalStatus: { $in: ["approved", null] }
  })
    .sort({ soldCount: -1, rating: -1 })
    .limit(4);

  res.json({
    ...serializeProduct(product, recentSalesMap),
    relatedProducts: relatedProducts.map((entry) => serializeProduct(entry))
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = prepareProductPayload(req.body);

  if (!payload.name || !payload.shortDescription || !payload.description) {
    throw new ApiError(400, "Name, short description, and description are required");
  }

  payload.slug = await ensureUniqueSlug(payload.name);
  payload.owner = req.user?._id || undefined;
  payload.vendorType = req.user?.role === "seller" ? "seller" : "admin";
  payload.commissionRate = req.user?.role === "seller" ? Number(req.user?.sellerProfile?.commissionRate || 10) : Number(payload.commissionRate || 10);

  if (req.user?.role === "seller") {
    payload.approvalStatus = "pending";
    payload.status = "active";
  } else {
    payload.approvalStatus = req.body.approvalStatus || "approved";
  }

  const product = await Product.create(payload);
  res.status(201).json(serializeProduct(product));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (req.user?.role === "seller" && String(product.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can only manage your own products");
  }

  if (req.user?.role === "admin" && product.vendorType === "seller") {
    throw new ApiError(403, "Seller listings must be reviewed, not edited directly by admin");
  }

  const payload = prepareProductPayload({ ...product.toObject(), ...req.body });
  payload.slug = req.body.name ? await ensureUniqueSlug(payload.name, product._id) : product.slug;

  if (req.user?.role === "seller") {
    payload.owner = product.owner;
    payload.vendorType = "seller";
    payload.approvalStatus = "pending";
    payload.approvalNote = "";
    payload.commissionRate = Number(product.commissionRate || req.user?.sellerProfile?.commissionRate || 10);
  }

  Object.assign(product, payload);
  await product.save();

  res.json(serializeProduct(product));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (req.user?.role === "seller" && String(product.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You can only delete your own products");
  }

  await product.deleteOne();
  res.json({ message: "Product deleted" });
});

export const reviewSellerProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.vendorType !== "seller") {
    throw new ApiError(400, "Only seller marketplace listings can be reviewed here");
  }

  const approvalStatus = String(req.body.approvalStatus || "").trim().toLowerCase();

  if (!["approved", "rejected", "pending"].includes(approvalStatus)) {
    throw new ApiError(400, "Invalid approval status");
  }

  product.approvalStatus = approvalStatus;
  product.approvalNote = String(req.body.approvalNote || "").trim();
  product.approvedAt = approvalStatus === "approved" ? new Date() : null;
  await product.save();

  res.json(serializeProduct(product));
});
