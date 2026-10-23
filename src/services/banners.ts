import type { ApiResponse, Banner } from "@/types";
import { API_BASE_URL } from "@/services/api";

export async function getBannersActivos(): Promise<Banner[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/banners`,
      typeof window === "undefined"
        ? {
            headers: { Accept: "application/json" },
            next: { tags: ["banners"], revalidate: 60 },
          }
        : {
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as ApiResponse<Banner[]>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}
