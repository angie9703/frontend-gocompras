import type { Metadata } from "next";
import { ProductosView } from "@/components/admin/ProductosView";

export const metadata: Metadata = {
  title: "Productos e inventario",
};

export default function AdminProductosPage() {
  return <ProductosView />;
}
