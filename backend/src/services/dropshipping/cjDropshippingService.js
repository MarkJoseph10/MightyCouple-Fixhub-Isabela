import { BaseProvider } from "./baseProvider.js";

export class CJDropshippingService extends BaseProvider {
  constructor() {
    super("cj-dropshipping");
  }

  async importProducts() {
    return [
      {
        name: "CJ Demo Product",
        shortDescription: "Imported from CJ Dropshipping demo feed.",
        description: "This placeholder product shows where a real CJ import would map supplier data into your catalog.",
        category: "Imported",
        price: 1290,
        compareAtPrice: 1590,
        stock: 24,
        sku: "CJ-DEMO-001",
        tags: ["dropshipping", "cj"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
            alt: "CJ demo product"
          }
        ],
        supplier: {
          provider: this.name,
          supplierId: "cj-demo-001",
          sourceUrl: "https://app.cjdropshipping.com/",
          syncedAt: new Date()
        }
      }
    ];
  }
}

