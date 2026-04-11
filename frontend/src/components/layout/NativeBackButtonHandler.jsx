import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  canNativeNavigateBack,
  getNativeHomeRoute,
  isNativeAuthRoute,
  isNativeTabRootRoute
} from "../../utils/nativeNavigation";

export default function NativeBackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isSeller } = useAuth();
  const [showExitHint, setShowExitHint] = useState(false);
  const latestStateRef = useRef({
    pathname: location.pathname,
    isAdmin,
    isSeller
  });
  const exitAttemptRef = useRef(0);

  useEffect(() => {
    latestStateRef.current = {
      pathname: location.pathname,
      isAdmin,
      isSeller
    };
  }, [isAdmin, isSeller, location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let removeListener = () => {};

    CapacitorApp.addListener("backButton", () => {
      const { pathname, isAdmin: currentIsAdmin, isSeller: currentIsSeller } = latestStateRef.current;
      const homeRoute = getNativeHomeRoute({ isAdmin: currentIsAdmin, isSeller: currentIsSeller });
      const onAuthRoute = isNativeAuthRoute(pathname);
      const onTabRootRoute = isNativeTabRootRoute(pathname, { isAdmin: currentIsAdmin, isSeller: currentIsSeller });
      const onExitRoute = onAuthRoute || pathname === homeRoute;

      if (onTabRootRoute && pathname !== homeRoute) {
        setShowExitHint(false);
        navigate(homeRoute, { replace: true });
        return;
      }

      if (onExitRoute) {
        const now = Date.now();

        if (now - exitAttemptRef.current < 1800) {
          CapacitorApp.exitApp();
          return;
        }

        exitAttemptRef.current = now;
        setShowExitHint(true);
        return;
      }

      setShowExitHint(false);

      if (canNativeNavigateBack()) {
        navigate(-1);
        return;
      }

      navigate(homeRoute, { replace: true });
    }).then((listenerHandle) => {
      removeListener = () => listenerHandle.remove();
    });

    return () => removeListener();
  }, [navigate]);

  useEffect(() => {
    if (!showExitHint) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowExitHint(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [showExitHint]);

  if (!Capacitor.isNativePlatform() || !showExitHint) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[140] flex justify-center px-4 md:hidden">
      <div className="rounded-full border border-white/10 bg-slate-950/92 px-4 py-2 text-xs font-medium text-slate-100 shadow-2xl backdrop-blur-xl">
        Press back again to exit
      </div>
    </div>
  );
}
