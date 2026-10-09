import type { Metadata } from "next";
import { CatalogoGestionView } from "@/components/admin/CatalogoGestionView";

export const metadata: Metadata = {
  title: "Categorías",
};

export default function AdminCategoriasPage() {
  return <CatalogoGestionView kind="categoria" />;
}
