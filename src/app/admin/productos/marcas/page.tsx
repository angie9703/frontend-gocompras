import type { Metadata } from "next";
import { CatalogoGestionView } from "@/components/admin/CatalogoGestionView";

export const metadata: Metadata = {
  title: "Marcas",
};

export default function AdminMarcasPage() {
  return <CatalogoGestionView kind="marca" />;
}
