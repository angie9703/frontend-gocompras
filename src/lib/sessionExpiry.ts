import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY, setAuthToken } from "@/lib/authToken";

const CREDENTIAL_PATHS = ["/auth/login", "/auth/register"];

const EXPIRED_TOKEN_CODES = new Set([
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "INVALID_TOKEN",
  "JWT_EXPIRED",
]);

type SessionClear = () => void;

let clearSessionState: SessionClear | null = null;
let adminRedirectStarted = false;

export function registerSessionClear(clear: SessionClear): void {
  clearSessionState = clear;
}

function requestPath(url: string | undefined): string {
  if (!url) return "";
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  try {
    return new URL(url, base).pathname;
  } catch {
    return url.split("?")[0] ?? "";
  }
}

export function isCredentialUrl(url: string | undefined): boolean {
  const path = requestPath(url);
  return CREDENTIAL_PATHS.some((suffix) => path === suffix || path.endsWith(suffix));
}

function authorizationValue(config: InternalAxiosRequestConfig | undefined): string | null {
  const headers = config?.headers;
  if (!headers) return null;
  const raw = typeof headers.get === "function" ? headers.get("Authorization") : headers.Authorization;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function isExpiredTokenBody(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const error = (data as { error?: { code?: unknown; message?: unknown } }).error;
  const code = typeof error?.code === "string" ? error.code.toUpperCase() : "";
  if (EXPIRED_TOKEN_CODES.has(code)) return true;

  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  const mentionsCredential = message.includes("token") || message.includes("sesión") || message.includes("sesion");
  const mentionsExpiry =
    message.includes("expir") || message.includes("inválid") || message.includes("invalid");
  return mentionsCredential && mentionsExpiry;
}

export function isSessionAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false;
  if ((error.config as { _retriedWithoutAuth?: boolean } | undefined)?._retriedWithoutAuth) return false;
  if (isCredentialUrl(error.config?.url)) return false;
  if (!authorizationValue(error.config)) return false;

  if (error.response.status === 401) return true;
  return isExpiredTokenBody(error.response.data);
}

function clearStoredSession(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // El navegador puede bloquear storage; el estado en memoria igual se limpia.
    }
  }

  setAuthToken(null);

  try {
    clearSessionState?.();
  } catch {
    // La limpieza de storage ya corrió.
  }
}

export function handleSessionExpired(): "redirect" | "silent" | "ignore" {
  if (typeof window === "undefined") return "ignore";

  const onAdmin = window.location.pathname.startsWith("/admin");

  if (onAdmin) {
    if (!adminRedirectStarted) {
      adminRedirectStarted = true;
      clearStoredSession();
      window.location.href = "/login";
    }
    return "redirect";
  }

  clearStoredSession();
  return "silent";
}
