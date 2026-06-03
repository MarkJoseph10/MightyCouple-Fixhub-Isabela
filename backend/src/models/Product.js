import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: String,
    alt: String
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: String,
    poster: String,
    durationSeconds: Number,
    sizeBytes: Number,
    mimeType: String
  },
  { _id: false }
);

const attributeSchema = new mongoose.Schema(
  {
    label: String,
    value: String
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    name: String,
    color: String,
    storage: String,
    model: String,
    sku: String,
    price: Number,
    stock: {
      type: Number,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const supplierSchema = new mongoose.Schema(
  {
    provider: String,
    supplierId: String,
    sourceUrl: String,
    syncedAt: Date
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    shortDescription: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    costPrice: {
      type: Number,
      default: 0
    },
    compareAtPrice: Number,
    stock: {
      type: Number,
      default: 0
    },
    sku: String,
    images: [imageSchema],
    video: videoSchema,
    tags: [String],
    featured: {
      type: Boolean,
      default: false
    },
    rating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    soldCount: {
      type: Number,
      default: 0
    },
    manualRecentSales24h: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    favoritesCount: {
      type: Number,
      default: 0
    },
    popularityLabel: {
      type: String,
      default: "Trending"
    },
    condition: {
      type: String,
      default: "Affordable tech"
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active"
    },
    vendorType: {
      type: String,
      enum: ["admin", "seller"],
      default: "admin"
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved"
    },
    approvalNote: String,
    approvedAt: Date,
    commissionRate: {
      type: Number,
      default: 10
    },
    attributes: [attributeSchema],
    variants: [variantSchema],
    bundleEligible: {
      type: Boolean,
      default: true
    },
    supplier: supplierSchema
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
