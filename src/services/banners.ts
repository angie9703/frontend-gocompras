import type { ApiResponse, Banner } from "@/types";
import api from "@/services/api";

export async function getBannersActivos(): Promise<Banner[]> {
  try {
    const { data } = await api.get<ApiResponse<Banner[]>>("/banners");
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}
