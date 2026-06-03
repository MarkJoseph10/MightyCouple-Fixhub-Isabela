import { BaseProvider } from "./baseProvider.js";

export class SpocketService extends BaseProvider {
  constructor() {
    super("spocket");
  }

  async importProducts() {
    return [
      {
        name: "Spocket Sample Product",
        shortDescription: "Sample imported product for Spocket-connected stores.",
        description: "Replace this sandbox response with a real Spocket API request when credentials are available.",
        category: "Imported",
        price: 1790,
        compareAtPrice: 2190,
        stock: 12,
        sku: "SPO-DEMO-001",
        tags: ["dropshipping", "spocket"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
            alt: "Spocket demo product"
          }
        ],
        supplier: {
          provider: this.name,
          supplierId: "spocket-demo-001",
          sourceUrl: "https://www.spocket.co/",
          syncedAt: new Date()
        }
      }
    ];
  }
}

