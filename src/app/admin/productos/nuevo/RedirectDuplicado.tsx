"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function RedirectDuplicado() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom")?.trim() ?? "";
  const duplicateSku = searchParams.get("duplicateSku")?.trim() ?? "";

  useEffect(() => {
    const query = new URLSearchParams();
    if (duplicateFrom) query.set("duplicateFrom", duplicateFrom);
    if (duplicateSku) query.set("duplicateSku", duplicateSku);
    const qs = query.toString();
    router.replace(qs ? `/admin/productos?${qs}` : "/admin/productos");
  }, [duplicateFrom, duplicateSku, router]);

  return <p className="text-sm text-slate-500">Abriendo el formulario...</p>;
}
