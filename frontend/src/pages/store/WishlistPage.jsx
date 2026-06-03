import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import LoadingScreen from "../../components/common/LoadingScreen";
import ProductCard from "../../components/store/ProductCard";
import { useCart } from "../../context/CartContext";

export default function WishlistPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlistProducts() {
      setLoading(true);

      try {
        const { data } = await api.get("/users/wishlist");
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }

    loadWishlistProducts();
  }, []);

  if (loading) {
    return <LoadingScreen label="Loading favorites..." />;
  }

  return (
    <div className="page-shell py-10">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Favorites</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Your wishlist</h1>
          </div>
          <p className="text-sm text-slate-400">Saved favorites stay with your account so you can access them on future devices.</p>
        </div>

        {!products.length ? (
          <div className="glass-panel rounded-[32px] p-8 text-center shadow-ambient">
            <p className="text-lg font-medium text-white">No saved favorites yet.</p>
            <p className="mt-2 text-sm text-slate-400">Tap the heart on any gadget to save it here.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-brand-500 px-5 py-3 font-semibold text-white">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
