import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    alt: String
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["fixed", "location"],
      default: "fixed"
    },
    fixedFee: {
      type: Number,
      default: 180
    },
    locationFees: [
      {
        label: String,
        keyword: String,
        fee: Number
      }
    ],
    currency: {
      type: String,
      default: "PHP"
    }
  },
  { _id: false }
);

const paymentOptionsSchema = new mongoose.Schema(
  {
    stripe: { type: Boolean, default: true },
    paypal: { type: Boolean, default: true },
    gcash: { type: Boolean, default: true },
    maya: { type: Boolean, default: true },
    bankTransfer: { type: Boolean, default: true },
    cod: { type: Boolean, default: true }
  },
  { _id: false }
);

const walletDetailsSchema = new mongoose.Schema(
  {
    accountName: String,
    number: String,
    qrUrl: String
  },
  { _id: false }
);

const bankTransferDetailsSchema = new mongoose.Schema(
  {
    bankName: String,
    accountName: String,
    accountNumber: String,
    qrUrl: String
  },
  { _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    gcash: {
      type: walletDetailsSchema,
      default: () => ({})
    },
    bankTransfer: {
      type: bankTransferDetailsSchema,
      default: () => ({})
    },
    proofOfPaymentRequired: {
      gcash: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: true },
      maya: { type: Boolean, default: true },
      paypal: { type: Boolean, default: false },
      stripe: { type: Boolean, default: false },
      cod: { type: Boolean, default: false }
    }
  },
  { _id: false }
);

const orderRulesSchema = new mongoose.Schema(
  {
    autoCancelUnpaidHours: {
      type: Number,
      default: 24
    },
    refundWindowDays: {
      type: Number,
      default: 7
    },
    refundEligibleStatuses: {
      type: [String],
      default: ["delivered", "paid"]
    },
    guestCheckoutMethods: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const promoCodeSchema = new mongoose.Schema(
  {
    code: String,
    type: {
      type: String,
      enum: ["fixed", "percent"],
      default: "percent"
    },
    value: Number,
    active: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const promotionSchema = new mongoose.Schema(
  {
    bundle: {
      enabled: { type: Boolean, default: false },
      minQuantity: { type: Number, default: 2 },
      discountPercent: { type: Number, default: 10 },
      label: { type: String, default: "Bundle deal" }
    },
    freeGift: {
      enabled: { type: Boolean, default: false },
      buyQuantity: { type: Number, default: 2 },
      giftProductId: { type: String, default: "" }
    },
    limitedOffer: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: "Limited time offer" },
      endsAt: Date,
      discountPercent: { type: Number, default: 0 }
    },
    promoCodes: [promoCodeSchema]
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    cartAdds: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 }
  },
  { _id: false }
);

const installmentSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      default: "weekly"
    },
    paymentCount: {
      type: Number,
      default: 8
    },
    downPaymentPercent: {
      type: Number,
      default: 10
    },
    serviceFeePercent: {
      type: Number,
      default: 0
    },
    gracePeriodDays: {
      type: Number,
      default: 3
    },
    releaseCondition: {
      type: String,
      enum: ["after_full_payment", "admin_approved_early_release"],
      default: "after_full_payment"
    },
    allowDeliveredOrdersRefund: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: "Mighty Couple",
      trim: true
    },
    logo: mediaSchema,
    banner: mediaSchema,
    heroImage: mediaSchema,
    backgroundImage: mediaSchema,
    favicon: mediaSchema,
    backgroundOverlay: {
      type: Number,
      default: 0.5
    },
    shipping: {
      type: shippingSchema,
      default: () => ({})
    },
    paymentOptions: {
      type: paymentOptionsSchema,
      default: () => ({})
    },
    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({})
    },
    orderRules: {
      type: orderRulesSchema,
      default: () => ({})
    },
    promotions: {
      type: promotionSchema,
      default: () => ({})
    },
    metrics: {
      type: metricsSchema,
      default: () => ({})
    },
    installment: {
      type: installmentSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);
