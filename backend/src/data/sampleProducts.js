import { createSlug } from "../utils/createSlug.js";

const sampleProducts = [
  {
    name: "Nova X Pro Smartphone",
    shortDescription: "A budget-friendly 5G phone with strong battery life and premium-looking finish.",
    description: "The Nova X Pro is built for shoppers who want a reliable daily phone without paying flagship prices. It includes multiple storage variants, strong cameras for the price, and solid all-day battery life.",
    category: "Phones",
    condition: "Affordable flagship alternative",
    popularityLabel: "Best seller",
    price: 8990,
    costPrice: 6200,
    compareAtPrice: 9990,
    stock: 18,
    sku: "NOVA-XPRO-001",
    featured: true,
    bundleEligible: true,
    soldCount: 184,
    viewsCount: 920,
    rating: 4.7,
    reviewCount: 36,
    tags: ["phone", "5g", "budget", "android"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
        alt: "Nova X Pro Smartphone"
      }
    ],
    variants: [
      { name: "Nova X Pro", color: "Midnight", storage: "128GB", model: "2025", price: 8990, stock: 8, sku: "NOVA-128-MID", isDefault: true },
      { name: "Nova X Pro", color: "Arctic", storage: "256GB", model: "2025", price: 10490, stock: 10, sku: "NOVA-256-ARC", isDefault: false }
    ],
    attributes: [
      { label: "Display", value: "6.7-inch AMOLED" },
      { label: "Battery", value: "5000mAh" }
    ]
  },
  {
    name: "AeroBook Lite 14",
    shortDescription: "Slim laptop for students, freelancers, and work-from-anywhere setups.",
    description: "The AeroBook Lite 14 gives buyers a practical laptop for productivity, online classes, and everyday business tasks. It balances performance, portability, and affordability for value-conscious customers.",
    category: "Laptops",
    condition: "Work-ready and budget-smart",
    popularityLabel: "Trending laptop",
    price: 27990,
    costPrice: 21900,
    compareAtPrice: 31990,
    stock: 9,
    sku: "AERO-LITE14-002",
    featured: true,
    bundleEligible: true,
    soldCount: 72,
    viewsCount: 510,
    rating: 4.6,
    reviewCount: 18,
    tags: ["laptop", "student", "work", "portable"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
        alt: "AeroBook Lite 14"
      }
    ],
    variants: [
      { name: "AeroBook Lite 14", color: "Silver", storage: "256GB SSD", model: "i3", price: 27990, stock: 4, sku: "AERO-I3-256", isDefault: true },
      { name: "AeroBook Lite 14", color: "Silver", storage: "512GB SSD", model: "i5", price: 33990, stock: 5, sku: "AERO-I5-512", isDefault: false }
    ],
    attributes: [
      { label: "RAM", value: "8GB" },
      { label: "Weight", value: "1.35kg" }
    ]
  },
  {
    name: "PulsePods ANC",
    shortDescription: "Wireless earbuds with clear calls, deep bass, and noise cancellation.",
    description: "PulsePods ANC are made for customers who want premium everyday audio without the premium markup. They are popular add-ons for phone shoppers and work well in bundles.",
    category: "Accessories",
    condition: "Everyday tech essential",
    popularityLabel: "Hot add-on",
    price: 2490,
    costPrice: 1450,
    compareAtPrice: 3190,
    stock: 34,
    sku: "PULSE-ANC-003",
    featured: false,
    bundleEligible: true,
    soldCount: 241,
    viewsCount: 830,
    rating: 4.8,
    reviewCount: 41,
    tags: ["earbuds", "audio", "bluetooth"],
    images: [
      {
        url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
        alt: "PulsePods ANC"
      }
    ],
    attributes: [
      { label: "Playback", value: "Up to 28 hours" },
      { label: "Connectivity", value: "Bluetooth 5.3" }
    ]
  }
].map((product) => ({
  ...product,
  slug: createSlug(product.name)
}));

export { sampleProducts };
