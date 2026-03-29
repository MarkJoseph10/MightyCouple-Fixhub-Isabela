const storageKey = "shopverse-recently-viewed";

export function readRecentlyViewed() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : [];
}

export function pushRecentlyViewed(product) {
  const current = readRecentlyViewed();
  const next = [
    {
      _id: product._id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0]?.url || product.image || "",
      price: product.priceFrom || product.price || 0,
      shortDescription: product.shortDescription || "",
      rating: product.rating || 0,
      soldCount: product.soldCount || 0
    },
    ...current.filter((entry) => entry._id !== product._id)
  ].slice(0, 6);

  localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}
