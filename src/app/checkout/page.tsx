import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Finalizar Tu Pedido",
  description:
    "Completá tu nombre y teléfono para enviar tu pedido por WhatsApp o descargar tu presupuesto en PDF.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
