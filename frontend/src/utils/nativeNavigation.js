export function isNativeAuthRoute(pathname = "") {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function getNativeHomeRoute({ isAdmin, isSeller }) {
  if (isAdmin) {
    return "/admin";
  }

  if (isSeller) {
    return "/seller";
  }

  return "/";
}

export function isNativeTabRootRoute(pathname = "", { isAdmin, isSeller }) {
  if (isAdmin) {
    return pathname === "/admin" || pathname === "/admin/messages" || pathname === "/admin/repairs";
  }

  if (isSeller) {
    return pathname === "/seller" || pathname === "/seller/orders" || pathname === "/seller/repairs" || pathname === "/seller/technician";
  }

  return pathname === "/" || pathname === "/notifications" || pathname === "/repairs" || pathname === "/profile";
}

export function canNativeNavigateBack() {
  if (typeof window === "undefined" || !window.history) {
    return false;
  }

  const historyIndex = window.history.state?.idx;

  if (typeof historyIndex === "number") {
    return historyIndex > 0;
  }

  return window.history.length > 1;
}
