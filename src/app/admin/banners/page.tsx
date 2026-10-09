import type { Metadata } from "next";
import { BannersView } from "@/components/admin/BannersView";

export const metadata: Metadata = {
  title: "Banners Promocionales",
};

export default function AdminBannersPage() {
  return <BannersView />;
}
