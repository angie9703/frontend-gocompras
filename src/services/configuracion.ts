import axios from "axios";
import type { AjustesTienda, ApiErrorResponse, ApiResponse, ConfiguracionComercio } from "@/types";
import api from "@/services/api";

export interface AjustesPayload {
  nombreTienda: string | null;
  textoFooter: string | null;
  whatsapp: string | null;
  emailContacto: string | null;
  direccion: string | null;
  instagram: string | null;
  facebook: string | null;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data && data.success === false && data.error?.message) {
      return data.error.message;
    }
    if (error.code === "ERR_NETWORK") {
      return "No pudimos conectar con el servidor. Verificá que el backend esté en marcha.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function getConfiguracion(): Promise<ConfiguracionComercio> {
  const { data } = await api.get<ApiResponse<ConfiguracionComercio>>("/configuracion");
  return data.data;
}

export async function getAjustes(): Promise<AjustesTienda> {
  try {
    const { data } = await api.get<ApiResponse<AjustesTienda>>("/ajustes");
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los ajustes de la tienda."));
  }
}

export async function updateAjustes(payload: AjustesPayload): Promise<AjustesTienda> {
  try {
    const { data } = await api.put<ApiResponse<AjustesTienda>>("/ajustes", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron guardar los ajustes de la tienda."));
  }
}
