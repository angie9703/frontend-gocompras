import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BenefitsBar } from "@/components/home/HeroBanner";
import { HomeBanner } from "@/components/home/HomeBanner";
import { PopularCategories } from "@/components/home/PopularCategories";
import { bannersVisibles } from "@/lib/banners";
import { getBannersActivos } from "@/services/banners";

export default async function HomePage() {
  const banners = bannersVisibles(await getBannersActivos());

  return (
    <>
      <HomeBanner banners={banners} />
      <PopularCategories />
      <FeaturedProducts />
      <BenefitsBar />
    </>
  );
}
