import type { Metadata } from "next";
import { ClientesView } from "@/components/admin/ClientesView";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function AdminClientesPage() {
  return <ClientesView />;
}
