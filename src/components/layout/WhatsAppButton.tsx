"use client";

import { WhatsAppIcon } from "@/components/ui/SocialIcons";
import { useAjustes } from "@/store/useAjustesStore";

export function WhatsAppButton() {
  const ajustes = useAjustes();
  const cleanPhone = ajustes?.whatsapp ? ajustes.whatsapp.replace(/\D/g, "") : "";
  if (!cleanPhone) return null;

  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
