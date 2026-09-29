import axios from "axios";
import type { ApiErrorResponse } from "@/types";

const TECHNICAL_PATTERN = /https?:\/\/|localhost|\/api\/v1\/|status code|ECONNREFUSED|Network Error/i;

const CUPON_ERROR_MESSAGES: Record<string, string> = {
  CUPON_NOT_FOUND: "Código de descuento inválido o vencido.",
  CUPON_INACTIVO: "Este código de descuento ya no está disponible.",
  CUPON_VENCIDO: "Este código de descuento venció.",
  CUPON_AGOTADO: "Este código de descuento alcanzó su límite de usos.",
  VALIDATION_ERROR: "Código de descuento inválido o vencido.",
};

export function friendlyUserError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    const code = data?.error?.code;
    if (code && CUPON_ERROR_MESSAGES[code]) return CUPON_ERROR_MESSAGES[code];
    const apiMessage = data?.error?.message;
    if (apiMessage && !TECHNICAL_PATTERN.test(apiMessage)) return apiMessage;
    if (error.code === "ERR_NETWORK") {
      return "No pudimos conectar con el servidor. Verificá que el backend esté en marcha.";
    }
  }

  if (error instanceof Error && error.message && !TECHNICAL_PATTERN.test(error.message)) {
    return error.message;
  }

  return fallback;
}
