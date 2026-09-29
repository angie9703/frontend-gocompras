import type { Metadata } from "next";
import { PedidosView } from "@/components/admin/PedidosView";

export const metadata: Metadata = {
  title: "Pedidos y presupuestos",
};

export default function AdminPedidosPage() {
  return <PedidosView />;
}
