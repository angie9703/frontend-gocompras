import type { Metadata } from "next";
import { BannersView } from "@/components/admin/BannersView";

export const metadata: Metadata = {
  title: "Banner Promocional del Home",
};

export default function AdminBannersPage() {
  return <BannersView />;
}
