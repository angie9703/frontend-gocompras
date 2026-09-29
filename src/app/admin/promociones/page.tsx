import type { Metadata } from "next";
import { PromocionesView } from "@/components/admin/PromocionesView";

export const metadata: Metadata = {
  title: "Cupones y promociones",
};

export default function AdminPromocionesPage() {
  return <PromocionesView />;
}
