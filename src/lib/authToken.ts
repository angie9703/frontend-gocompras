export const AUTH_STORAGE_KEY = "gocompras-auth";
export const AUTH_TOKEN_KEY = "gocompras-token";

let memoryToken: string | null = null;

function readTokenFromPersist(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;

  const dedicated = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (dedicated) {
    memoryToken = dedicated;
    return dedicated;
  }

  const persisted = readTokenFromPersist();
  if (persisted) memoryToken = persisted;
  return persisted;
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}
