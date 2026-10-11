import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CheckoutHeader({ nombreComercio }: { nombreComercio: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-16">
        <Link
          href="/"
          className="flex min-w-0 items-center"
          aria-label={`${nombreComercio} - Volver al inicio`}
        >
          <Image
            src="/logo-header.png"
            alt={`${nombreComercio} - Materiales Eléctricos`}
            width={212}
            height={40}
            className="h-6 w-auto max-w-full object-contain sm:h-7 lg:h-8"
            priority
          />
        </Link>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Presupuesto Oficial · Checkout Seguro</span>
          <span className="sm:hidden">Checkout Seguro</span>
        </span>
      </div>
    </header>
  );
}
