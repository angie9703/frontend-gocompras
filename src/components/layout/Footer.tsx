"use client";

import { Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/SocialIcons";
import { CONFIG_FALLBACK, formatWhatsAppDisplay, getFbHandle, getIgHandle, splitHorarios } from "@/lib/comercio";
import { useAjustes } from "@/store/useAjustesStore";
import { useComercioConfig } from "@/store/useConfigStore";

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const liveConfig = useComercioConfig();
  const ajustes = useAjustes();

  useEffect(() => {
    setMounted(true);
  }, []);

  const config = mounted ? liveConfig : CONFIG_FALLBACK;
  const horarios = splitHorarios(config.horariosAtencion);
  const cleanPhone = ajustes?.whatsapp ? ajustes.whatsapp.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : "";
  const whatsappLabel = formatWhatsAppDisplay(ajustes?.whatsapp);
  const instagramHandle = getIgHandle(ajustes?.instagram);
  const facebookHandle = getFbHandle(ajustes?.facebook);

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Image
            src="/logo.png"
            alt={`${config.nombreComercio} - Materiales Eléctricos`}
            width={180}
            height={50}
            className="h-10 w-auto bg-transparent object-contain"
          />
          <p className="mt-3 max-w-xs text-sm text-muted">
            {ajustes?.textoFooter?.trim() ||
              "Materiales eléctricos para tu proyecto y hogar. Venta directa, retiro en punto seguro o envío a convenir."}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-main uppercase">Horarios</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {horarios.map((horario) => (
              <li key={horario}>{horario}</li>
            ))}
          </ul>
        </div>

        <div id="contacto">
          <h2 className="text-sm font-semibold tracking-wide text-main uppercase">Contacto</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {whatsappUrl ? (
              <li>
                <a
                  href={whatsappUrl}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="size-4" aria-hidden />
                  {whatsappLabel}
                </a>
              </li>
            ) : (
              <li className="text-muted">WhatsApp: te contactamos al confirmar el pedido</li>
            )}
            {ajustes?.instagram ? (
              <li>
                <a
                  href={ajustes.instagram}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon className="size-4" />
                  {instagramHandle}
                </a>
              </li>
            ) : null}
            {ajustes?.facebook ? (
              <li>
                <a
                  href={ajustes.facebook}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FacebookIcon className="size-4" />
                  {facebookHandle}
                </a>
              </li>
            ) : null}
            {ajustes?.emailContacto?.trim() ? (
              <li>
                <a
                  href={`mailto:${ajustes.emailContacto.trim()}`}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Mail className="size-4" aria-hidden />
                  {ajustes.emailContacto.trim()}
                </a>
              </li>
            ) : null}
            {ajustes?.direccion?.trim() ? (
              <li className="flex items-start gap-2 text-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{ajustes.direccion.trim()}</span>
              </li>
            ) : null}
          </ul>
          {config.mensajeFlete ? (
            <p className="mt-4 text-sm text-muted">{config.mensajeFlete}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted">
          © 2026 {config.nombreComercio}. Todos los derechos reservados.{" "}
          <Link href="/" className="text-primary hover:underline">
            Inicio
          </Link>
        </p>
      </div>
    </footer>
  );
}
