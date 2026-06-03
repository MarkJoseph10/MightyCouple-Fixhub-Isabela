import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProvider } from "../services/dropshipping/providerFactory.js";
import { createSlug } from "../utils/createSlug.js";

export const connectSupplier = asyncHandler(async (req, res) => {
  const { provider } = req.body;
  const service = getProvider(provider);
  const result = await service.connect(req.body.credentials || {});

  res.json({
    message: `${provider} connected successfully`,
    ...result
  });
});

export const importSupplierProducts = asyncHandler(async (req, res) => {
  const { provider } = req.body;
  const service = getProvider(provider);
  const importedProducts = await service.importProducts(req.body || {});
  const createdProducts = [];
  let skippedDuplicates = 0;

  for (const product of importedProducts) {
    const existing = await Product.findOne({ sku: product.sku });

    if (existing) {
      skippedDuplicates += 1;
      continue;
    }

    createdProducts.push(
      await Product.create({
        ...product,
        slug: createSlug(product.name),
        status: "active"
      })
    );
  }

  const fetchedCount = importedProducts.length;
  const message =
    fetchedCount === 0
      ? "No matching products were returned by the supplier."
      : createdProducts.length === 0
        ? "All fetched supplier products were skipped because they already exist in your catalog."
        : "Supplier products imported successfully.";

  res.status(201).json({
    provider,
    message,
    fetchedCount,
    importedCount: createdProducts.length,
    skippedDuplicates,
    products: createdProducts
  });
});

export const syncSupplierProducts = asyncHandler(async (req, res) => {
  const { provider } = req.body;
  const service = getProvider(provider);
  const existingProducts = await Product.find({ "supplier.provider": provider });
  const result = await service.syncProducts({
    ...(req.body || {}),
    products: existingProducts.map((product) => ({
      _id: product._id,
      supplier: product.supplier,
      sku: product.sku
    }))
  });

  const updates = Array.isArray(result.products) ? result.products : [];

  for (const update of updates) {
    await Product.updateOne(
      { "supplier.provider": provider, "supplier.supplierId": update.supplierId },
      {
        $set: {
          name: update.name,
          shortDescription: update.shortDescription,
          description: update.description,
          category: update.category,
          price: update.price,
          costPrice: update.costPrice,
          compareAtPrice: update.compareAtPrice,
          stock: update.stock,
          images: update.images,
          tags: update.tags,
          attributes: update.attributes,
          variants: update.variants,
          supplier: update.supplier
        }
      }
    );
  }

  await Product.updateMany(
    { "supplier.provider": provider },
    {
      $set: {
        "supplier.syncedAt": new Date()
      }
    }
  );

  res.json({
    message: "Supplier sync completed",
    ...result
  });
});
