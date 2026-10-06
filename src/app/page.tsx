import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BenefitsBar, HeroBanner } from "@/components/home/HeroBanner";
import { PopularCategories } from "@/components/home/PopularCategories";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <PopularCategories />
      <FeaturedProducts />
      <BenefitsBar />
    </>
  );
}
