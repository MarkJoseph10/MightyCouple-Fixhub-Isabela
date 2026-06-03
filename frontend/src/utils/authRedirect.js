export function getRoleHomePath(user) {
  if (user?.role === "admin") {
    return "/admin";
  }

  if (user?.role === "seller") {
    return user?.sellerProfile?.isActive === false ? "/seller/appeal" : "/seller";
  }

  return "/";
}

export function resolvePostAuthRedirect(user, requestedPath = "") {
  const normalizedPath = typeof requestedPath === "string" ? requestedPath.trim() : "";

  if (normalizedPath && !normalizedPath.startsWith("/auth") && normalizedPath !== "/download") {
    return normalizedPath;
  }

  return getRoleHomePath(user);
}
