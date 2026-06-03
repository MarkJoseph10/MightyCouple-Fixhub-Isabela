import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import ChatWidget from "../components/common/ChatWidget";
import InstallAppPrompt from "../components/common/InstallAppPrompt";
import Footer from "../components/layout/Footer";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import Navbar from "../components/layout/Navbar";
import NativeAppHeader from "../components/layout/NativeAppHeader";
import { useAuth } from "../context/AuthContext";

export default function StoreLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const isAuthRoute = location.pathname === "/auth" || location.pathname.startsWith("/auth/");
  const showNativeAuthOnlyShell = isNativeApp && !loading && !user;

  useEffect(() => {
    if (!showNativeAuthOnlyShell || isAuthRoute) {
      return;
    }

    navigate("/auth", { replace: true, state: { from: location.pathname } });
  }, [isAuthRoute, location.pathname, navigate, showNativeAuthOnlyShell]);

  if (showNativeAuthOnlyShell && !isAuthRoute) {
    return <div className="min-h-screen" />;
  }

  if (showNativeAuthOnlyShell && isAuthRoute) {
    return (
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isNativeApp ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-24 md:pb-0"}`}>
      {isNativeApp ? <NativeAppHeader /> : <Navbar />}
      <Outlet />
      {!isNativeApp ? (
        <div className="hidden md:block">
          <Footer />
        </div>
      ) : null}
      <MobileBottomNav />
      {!isNativeApp ? <InstallAppPrompt /> : null}
      <ChatWidget />
    </div>
  );
}
