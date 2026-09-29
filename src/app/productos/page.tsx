import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogFallback, CatalogView } from "@/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Buscá materiales eléctricos por SKU, categoría, precio y stock en GO COMPRAS.",
};

export default function ProductosPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogView />
    </Suspense>
  );
}
