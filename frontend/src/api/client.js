import axios from "axios";
import { resolveApiBaseUrl } from "./baseUrl";
import { clearStoredAuthToken, getStoredAuthTokenSync } from "../utils/authStorage";

const api = axios.create({
  baseURL: resolveApiBaseUrl()
});

let isHandlingUnauthorized = false;

api.interceptors.request.use((config) => {
  const token = getStoredAuthTokenSync();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      void clearStoredAuthToken();

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.assign(`/auth?session=expired&from=${encodeURIComponent(nextPath)}`);
      }

      window.setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 250);
    }

    return Promise.reject(error);
  }
);

export default api;
