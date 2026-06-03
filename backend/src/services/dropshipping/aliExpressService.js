import { BaseProvider } from "./baseProvider.js";

export class AliExpressService extends BaseProvider {
  constructor() {
    super("aliexpress");
  }

  async importProducts() {
    return [
      {
        name: "AliExpress Sample Import",
        shortDescription: "Starter placeholder for AliExpress sourcing workflows.",
        description: "Use this adapter as the place to add real AliExpress API or scraping integrations for product import and stock sync.",
        category: "Imported",
        price: 990,
        compareAtPrice: 1290,
        stock: 41,
        sku: "ALI-DEMO-001",
        tags: ["dropshipping", "aliexpress"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
            alt: "AliExpress demo product"
          }
        ],
        supplier: {
          provider: this.name,
          supplierId: "ali-demo-001",
          sourceUrl: "https://www.aliexpress.com/",
          syncedAt: new Date()
        }
      }
    ];
  }
}
