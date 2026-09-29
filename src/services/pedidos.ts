import axios from "axios";
import type { ApiErrorResponse, ApiResponse, CreatePedidoPayload, Pedido, ZonaEnvio } from "@/types";
import api from "@/services/api";

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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function unwrapPedidos(payload: Pedido[] | { items?: Pedido[] } | null | undefined): Pedido[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function crearPedido(payload: CreatePedidoPayload): Promise<Pedido> {
  try {
    const { data } = await api.post<ApiResponse<Pedido>>("/pedidos", payload);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el pedido."));
  }
}

export async function descargarPdfPresupuesto(codigoPedido: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("La descarga de PDF solo está disponible en el navegador.");
  }

  try {
    const response = await api.get(`/pedidos/${encodeURIComponent(codigoPedido)}/pdf`, {
      responseType: "blob",
    });

    const blob = response.data as Blob;
    if (blob.type.includes("json")) {
      const payload = JSON.parse(await blob.text()) as ApiErrorResponse;
      throw new Error(payload.error?.message ?? "No se pudo descargar el presupuesto.");
    }

    const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${codigoPedido}.pdf`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo descargar el presupuesto en PDF."));
  }
}

export async function getZonasEnvio(): Promise<ZonaEnvio[]> {
  try {
    const { data } = await api.get<ApiResponse<ZonaEnvio[] | { items: ZonaEnvio[] }>>("/envios/zonas");
    const zonas = data.data;
    if (Array.isArray(zonas)) return zonas;
    if (zonas && Array.isArray(zonas.items)) return zonas.items;
    return [];
  } catch {
    return [];
  }
}

export async function getMisPedidos(): Promise<Pedido[]> {
  try {
    const { data } = await api.get<ApiResponse<Pedido[] | { items: Pedido[] }>>("/pedidos/mis-pedidos");
    return unwrapPedidos(data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar tus pedidos."));
  }
}
