import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { getAuthToken } from "@/lib/authToken";
import { handleSessionExpired, isCredentialUrl, isSessionAuthFailure } from "@/lib/sessionExpiry";

type RetriableConfig = InternalAxiosRequestConfig & {
  _retriedWithoutAuth?: boolean;
};

const SAFE_RETRY_METHODS = new Set(["get", "head", "options"]);

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

function clearAuthorization(config: InternalAxiosRequestConfig): void {
  if (typeof config.headers.delete === "function") {
    config.headers.delete("Authorization");
    return;
  }
  delete config.headers.Authorization;
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !isCredentialUrl(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  clearAuthorization(config);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!isSessionAuthFailure(error) || !axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const outcome = handleSessionExpired();
    const config = error.config as RetriableConfig | undefined;
    const method = (config?.method ?? "get").toLowerCase();

    if (
      outcome === "silent" &&
      config &&
      !config._retriedWithoutAuth &&
      SAFE_RETRY_METHODS.has(method)
    ) {
      config._retriedWithoutAuth = true;
      clearAuthorization(config);
      return api.request(config);
    }

    return Promise.reject(error);
  },
);

export default api;
