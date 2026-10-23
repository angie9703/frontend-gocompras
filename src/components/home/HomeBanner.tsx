import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { bannerImages, bannerLink } from "@/lib/banners";
import type { Banner } from "@/types";

function SlideFrame({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  if (!href) return <div className="absolute inset-0 block">{children}</div>;
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="absolute inset-0 block" aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="absolute inset-0 block" aria-label={label}>
      {children}
    </a>
  );
}

function FirstBannerSlide({ banner }: { banner: Banner }) {
  const images = bannerImages(banner);
  const mobileSrc = images.mobile || images.desktop;
  const desktopSrc = images.desktop || images.mobile;
  if (!mobileSrc || !desktopSrc) return null;
  const label = banner.titulo?.trim() || "Banner promocional";

  return (
    <div className="relative aspect-[4/3] min-w-full shrink-0 md:aspect-auto md:h-[22rem]">
      <SlideFrame href={bannerLink(banner)} label={label}>
        <Image
          src={mobileSrc}
          alt=""
          fill
          priority={true}
          sizes="100vw"
          className="block object-contain md:hidden"
          draggable={false}
        />
        <Image
          src={desktopSrc}
          alt={label}
          fill
          priority={true}
          sizes="(max-width: 768px) 100vw, 1280px"
          className="hidden object-cover md:block"
          draggable={false}
        />
      </SlideFrame>
    </div>
  );
}

function RestBannerSlide({ banner }: { banner: Banner }) {
  const images = bannerImages(banner);
  const mobileSrc = images.mobile || images.desktop;
  const desktopSrc = images.desktop || images.mobile;
  if (!mobileSrc || !desktopSrc) return null;
  const label = banner.titulo?.trim() || "Banner promocional";

  return (
    <div className="relative aspect-[4/3] min-w-full shrink-0 md:aspect-auto md:h-[22rem]">
      <SlideFrame href={bannerLink(banner)} label={label}>
        <Image
          src={mobileSrc}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="block object-contain md:hidden"
          draggable={false}
        />
        <Image
          src={desktopSrc}
          alt={label}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 1280px"
          className="hidden object-cover md:block"
          draggable={false}
        />
      </SlideFrame>
    </div>
  );
}

export function HomeBanner({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;
  const [first, ...rest] = banners;
  if (!first) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:pt-6">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 md:aspect-auto md:h-[22rem]">
        <BannerCarousel count={banners.length}>
          <FirstBannerSlide banner={first} />
          {rest.map((banner) => (
            <RestBannerSlide key={banner.id} banner={banner} />
          ))}
        </BannerCarousel>
      </div>
    </section>
  );
}
