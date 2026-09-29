import { formatARS } from "@/lib/money";

export interface PedidoWhatsAppInput {
  codigo: string;
  nombre: string;
  telefono: string;
  tipoEntregaLabel: string;
  metodoPagoLabel: string;
  items: Array<{
    nombre: string;
    varianteSku?: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  total: number;
  nombreComercio: string;
  pdfUrl?: string | null;
  notas?: string;
}

function apiBaseUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/v1`;
  }
  return null;
}

export function resolvePublicPdfUrl(codigo: string, pdfUrl?: string | null): string {
  const path = `/pedidos/${encodeURIComponent(codigo)}/pdf`;
  const base = apiBaseUrl();
  if (base) return `${base}${path}`;

  const raw = pdfUrl?.trim() ?? "";
  if (raw && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(raw)) return raw;
  return path;
}

export function buildPedidoWhatsAppMessage(input: PedidoWhatsAppInput): string {
  const productos = input.items.map((item) => {
    const sku = item.varianteSku ? ` (${item.varianteSku})` : "";
    const subtotal = formatARS(item.precioUnitario * item.cantidad);
    return `• ${item.nombre}${sku} x${item.cantidad} — ${subtotal}`;
  });

  const lines = [
    `🛒 *Pedido ${input.codigo}* — ${input.nombreComercio}`,
    "",
    `👤 *Nombre:* ${input.nombre}`,
    `📱 *Teléfono:* ${input.telefono}`,
    `🚚 *Modalidad de entrega:* ${input.tipoEntregaLabel}`,
    `💳 *Método de pago:* ${input.metodoPagoLabel}`,
    "",
    "📦 *Productos:*",
    ...productos,
    "",
    `💰 *Total:* ${formatARS(input.total)}`,
  ];

  const pdfLink = resolvePublicPdfUrl(input.codigo, input.pdfUrl);
  if (pdfLink) {
    lines.push("", `📄 *Presupuesto PDF:* ${pdfLink}`);
  }

  const notas = input.notas?.trim();
  if (notas) {
    lines.push("", `📝 *Notas:* ${notas}`);
  }

  lines.push("", "La dirección y el flete los coordinamos por este chat.");

  return lines.join("\n");
}

export function buildPedidoWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const mensajeTexto = encodeURIComponent(message);
  const base = cleanPhone ? `https://wa.me/${cleanPhone}` : "https://wa.me/";
  return `${base}?text=${mensajeTexto}`;
}
