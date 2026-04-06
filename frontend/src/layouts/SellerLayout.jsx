import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/layout/Navbar";
import SellerSidebar from "../components/layout/SellerSidebar";
import { useAuth } from "../context/AuthContext";

const pageLabels = {
  "/seller": "Overview",
  "/seller/products": "My Products",
  "/seller/orders": "My Orders",
  "/seller/repairs": "Repairs",
  "/seller/technician": "Technician application",
  "/seller/messages": "Messages"
};

export default function SellerLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { refreshUser } = useAuth();
  const currentLabel = useMemo(() => pageLabels[location.pathname] || "Seller Hub", [location.pathname]);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [location.pathname, refreshUser]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="admin-shell py-6 lg:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Seller</p>
            <p className="mt-1 font-semibold text-white">{currentLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
          >
            <Menu size={18} />
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <SellerSidebar />
          </div>
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] overflow-y-auto bg-slate-950/95 p-4 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Seller menu</p>
                  <p className="mt-1 font-semibold text-white">{currentLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <SellerSidebar onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
