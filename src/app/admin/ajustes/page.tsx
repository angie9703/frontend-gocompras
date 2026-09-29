import type { Metadata } from "next";
import { AjustesView } from "@/components/admin/AjustesView";

export const metadata: Metadata = {
  title: "Ajustes de la Tienda",
};

export default function AdminAjustesPage() {
  return <AjustesView />;
}
