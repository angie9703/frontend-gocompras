import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductosView } from "@/components/admin/ProductosView";

export const metadata: Metadata = {
  title: "Productos e inventario",
};

export default function AdminProductosPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Cargando productos...</p>}>
      <ProductosView />
    </Suspense>
  );
}
