import axios from "axios";
import { env } from "../../config/env.js";
import { BaseProvider } from "./baseProvider.js";

const CJ_API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const DEFAULT_IMPORT_LIMIT = 10;
const tokenCache = {
  accessToken: "",
  accessTokenExpiresAt: 0,
  refreshToken: "",
  refreshTokenExpiresAt: 0
};

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function toTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPeso(value) {
  const rate = Number.isFinite(env.cjPhpExchangeRate) && env.cjPhpExchangeRate > 0 ? env.cjPhpExchangeRate : 58;
  return roundMoney(Number(value || 0) * rate);
}

function applyMarkup(value) {
  const markup = Number.isFinite(env.cjMarkupPercent) ? env.cjMarkupPercent : 15;
  return roundMoney(value * (1 + markup / 100));
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function extractProductListV2Rows(listData) {
  const contentEntries = asArray(listData?.content);
  const nestedProductLists = contentEntries.flatMap((entry) => asArray(entry?.productList));

  if (nestedProductLists.length) {
    return nestedProductLists;
  }

  return asArray(listData?.list || listData?.records || listData?.items || listData);
}

function extractLegacyProductRows(listData) {
  return asArray(listData?.list || listData?.records || listData?.items || listData);
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function normalizeName(product = {}) {
  const parsedNames = asArray(product.productName);
  return (
    pickFirst(
      product.productNameEn,
      product.nameEn,
      product.productNameCn,
      product.productName,
      product.productNameEnglish,
      parsedNames[0]
    ) || "CJ Imported Product"
  );
}

function normalizeCategory(product = {}) {
  const raw = pickFirst(product.categoryName, product.category, product.categoryNameEn, product.categoryNameCn, "Imported");
  return String(raw)
    .split(/[>/|,-]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .pop() || "Imported";
}

function normalizeDescription(product = {}) {
  return pickFirst(product.description, product.descriptionEn, product.productDesc, product.productDescription, product.remark) || "Imported from CJ Dropshipping.";
}

function normalizeShortDescription(product = {}) {
  return pickFirst(product.shortDescription, product.productNameEn, product.productName, product.nameEn) || "Imported from CJ Dropshipping.";
}

function parseImageSet(product = {}) {
  const candidates = [
    ...(asArray(product.productImage)),
    ...(asArray(product.productImageSet)),
    ...(asArray(product.images)),
    ...(asArray(product.extraImages))
  ];

  const unique = [...new Set(candidates.filter(Boolean).map((value) => String(value).trim()))];
  return unique.slice(0, 8).map((url, index) => ({
    url,
    alt: `${normalizeName(product)} image ${index + 1}`
  }));
}

function parseTags(product = {}) {
  const tagCandidates = [
    ...(asArray(product.tags)),
    ...(asArray(product.categoryName ? String(product.categoryName).split(/[>/|,-]/) : []))
  ];

  const tags = [...new Set(tagCandidates.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
  return ["dropshipping", "cj", ...tags].slice(0, 10);
}

function parseVariantName(variant = {}) {
  return pickFirst(
    variant.variantName,
    variant.productName,
    [variant.variantKey, variant.variantValue].filter(Boolean).join(": "),
    [variant.color, variant.storage, variant.model].filter(Boolean).join(" | ")
  ) || "Default option";
}

function parseVariantStock(variant = {}) {
  const inventorySources = [
    variant.stock,
    variant.inventory,
    variant.inventoryNum,
    variant.inventoryQuantity,
    variant.quantity,
    variant.totalInventoryNum,
    variant.sellableStock
  ];

  for (const source of inventorySources) {
    const amount = Number(source);
    if (Number.isFinite(amount) && amount >= 0) {
      return Math.floor(amount);
    }
  }

  if (variant.inventoryMap && typeof variant.inventoryMap === "object") {
    return Object.values(variant.inventoryMap).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  }

  return 0;
}

function parseVariantCost(variant = {}, product = {}) {
  const raw = Number(
    pickFirst(
      variant.sellPrice,
      variant.sellPriceUsd,
      variant.price,
      variant.priceUsd,
      product.sellPrice,
      product.sellPriceUsd,
      product.price,
      product.priceUsd,
      0
    )
  );

  return roundMoney(toPeso(raw));
}

function mapVariants(detail = {}, fallbackProduct = {}) {
  const variants = asArray(detail.variants || detail.variantList || detail.skuList || detail.productVariants);

  if (!variants.length) {
    const baseCost = parseVariantCost({}, detail);
    return [
      {
        name: "Default option",
        sku: pickFirst(detail.productSku, fallbackProduct.productSku, detail.pid, fallbackProduct.pid, ""),
        price: applyMarkup(baseCost),
        stock: Number(detail.totalInventoryNum || fallbackProduct.totalInventoryNum || fallbackProduct.stock || 0),
        isDefault: true
      }
    ];
  }

  return variants.map((variant, index) => {
    const costPrice = parseVariantCost(variant, detail);

    return {
      name: parseVariantName(variant),
      color: pickFirst(variant.color, variant.variantColor, ""),
      storage: pickFirst(variant.storage, variant.variantStorage, ""),
      model: pickFirst(variant.model, variant.variantModel, ""),
      sku: pickFirst(variant.productSku, variant.sku, variant.vid, ""),
      price: applyMarkup(costPrice),
      stock: parseVariantStock(variant),
      isDefault: index === 0
    };
  });
}

function mapToCatalogProduct(product = {}, detail = product) {
  const images = parseImageSet(detail).length ? parseImageSet(detail) : parseImageSet(product);
  const variants = mapVariants(detail, product);
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const baseCostPrice = variants.length
    ? Math.min(...variants.map((variant) => Number(variant.price || 0)).filter((value) => Number.isFinite(value) && value > 0))
    : applyMarkup(parseVariantCost({}, detail));
  const sellingPrice = Number.isFinite(baseCostPrice) && baseCostPrice > 0 ? baseCostPrice : applyMarkup(parseVariantCost({}, detail));
  const compareAtPrice = roundMoney(sellingPrice * 1.12);

  return {
    name: normalizeName(detail),
    shortDescription: normalizeShortDescription(detail),
    description: normalizeDescription(detail),
    category: normalizeCategory(detail),
    price: sellingPrice,
    costPrice: roundMoney(sellingPrice / (1 + ((Number.isFinite(env.cjMarkupPercent) ? env.cjMarkupPercent : 15) / 100))),
    compareAtPrice,
    stock,
    sku: pickFirst(detail.productSku, detail.sku, detail.pid, product.productSku, product.pid, ""),
    images,
    tags: parseTags(detail),
    attributes: [
      { label: "Supplier", value: "CJ Dropshipping" },
      pickFirst(detail.pid, product.pid) ? { label: "CJ Product ID", value: pickFirst(detail.pid, product.pid) } : null
    ].filter(Boolean),
    variants,
    supplier: {
      provider: "cj-dropshipping",
      supplierId: pickFirst(detail.pid, product.pid, detail.productId, product.productId, ""),
      sourceUrl: pickFirst(detail.sourceUrl, product.sourceUrl, "https://app.cjdropshipping.com/"),
      syncedAt: new Date()
    }
  };
}

export class CJDropshippingService extends BaseProvider {
  constructor() {
    super("cj-dropshipping");
    this.client = axios.create({
      baseURL: CJ_API_BASE,
      timeout: 20000
    });
  }

  ensureConfigured() {
    if (!env.cjApiKey) {
      throw new Error("CJ_API_KEY is missing. Add it to the backend environment before using the CJ Dropshipping integration.");
    }
  }

  async requestAccessToken() {
    const { data } = await this.client.post(
      "/authentication/getAccessToken",
      {
        apiKey: env.cjApiKey
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!data?.result || !data?.data?.accessToken) {
      throw new Error(data?.message || "CJ authentication failed.");
    }

    tokenCache.accessToken = data.data.accessToken;
    tokenCache.refreshToken = data.data.refreshToken || "";
    tokenCache.accessTokenExpiresAt = toTimestamp(data.data.accessTokenExpiryDate);
    tokenCache.refreshTokenExpiresAt = toTimestamp(data.data.refreshTokenExpiryDate);

    return tokenCache.accessToken;
  }

  async refreshAccessToken() {
    if (!tokenCache.refreshToken || Date.now() >= tokenCache.refreshTokenExpiresAt - 60_000) {
      return this.requestAccessToken();
    }

    const { data } = await this.client.post(
      "/authentication/refreshAccessToken",
      {
        refreshToken: tokenCache.refreshToken
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (!data?.result || !data?.data?.accessToken) {
      return this.requestAccessToken();
    }

    tokenCache.accessToken = data.data.accessToken;
    tokenCache.refreshToken = data.data.refreshToken || tokenCache.refreshToken;
    tokenCache.accessTokenExpiresAt = toTimestamp(data.data.accessTokenExpiryDate);
    tokenCache.refreshTokenExpiresAt = toTimestamp(data.data.refreshTokenExpiryDate);

    return tokenCache.accessToken;
  }

  async getAccessToken() {
    this.ensureConfigured();

    if (tokenCache.accessToken && Date.now() < tokenCache.accessTokenExpiresAt - 60_000) {
      return tokenCache.accessToken;
    }

    if (tokenCache.refreshToken) {
      return this.refreshAccessToken();
    }

    return this.requestAccessToken();
  }

  async request(path, { method = "get", params, data } = {}) {
    const accessToken = await this.getAccessToken();
    const response = await this.client.request({
      url: path,
      method,
      params,
      data,
      headers: {
        "CJ-Access-Token": accessToken
      }
    });

    if (!response.data?.result) {
      throw new Error(response.data?.message || `CJ API request failed for ${path}`);
    }

    return response.data.data;
  }

  async getProductDetails(pid) {
    const data = await this.request("/product/query", {
      params: { pid }
    });

    return data?.product || data;
  }

  async connect() {
    const accessToken = await this.getAccessToken();
    return {
      provider: this.name,
      status: "connected",
      mode: "live",
      tokenPreview: `${accessToken.slice(0, 6)}...`,
      importLimit: DEFAULT_IMPORT_LIMIT
    };
  }

  async importProducts(options = {}) {
    const page = Math.max(1, Number(options.page || options.pageNum || 1));
    const size = Math.min(20, Math.max(1, Number(options.size || options.pageSize || DEFAULT_IMPORT_LIMIT)));
    const keyword = String(options.keyword || "").trim();
    const listData = await this.request("/product/listV2", {
      params: {
        page,
        size,
        ...(keyword ? { keyWord: keyword } : {})
      }
    });

    let rows = extractProductListV2Rows(listData);

    // Fall back to the documented legacy list endpoint if V2 returns no rows for this account/query.
    if (!rows.length) {
      const legacyData = await this.request("/product/list", {
        params: {
          pageNum: page,
          pageSize: size,
          ...(keyword ? { productName: keyword } : {})
        }
      });

      rows = extractLegacyProductRows(legacyData);
    }

    const importedProducts = [];

    for (const row of rows) {
      const pid = pickFirst(row.pid, row.productId);
      if (!pid) {
        continue;
      }

      const detail = await this.getProductDetails(pid);
      importedProducts.push(mapToCatalogProduct(row, detail));
    }

    return importedProducts;
  }

  async syncProducts(options = {}) {
    const products = Array.isArray(options.products) ? options.products : [];
    const updates = [];

    for (const product of products) {
      const supplierId = pickFirst(product?.supplier?.supplierId, product?.supplierId, product?.pid);
      if (!supplierId) {
        continue;
      }

      const detail = await this.getProductDetails(supplierId);
      updates.push({
        supplierId,
        ...mapToCatalogProduct(product, detail)
      });
    }

    return {
      provider: this.name,
      synced: updates.length,
      products: updates
    };
  }
}
