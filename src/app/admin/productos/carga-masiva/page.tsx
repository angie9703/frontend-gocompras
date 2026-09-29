import type { Metadata } from "next";
import { CargaMasivaView } from "@/components/admin/CargaMasivaView";

export const metadata: Metadata = {
  title: "Carga masiva",
};

export default function CargaMasivaPage() {
  return <CargaMasivaView />;
}
