import { Suspense } from "react";
import { Album, Catering, Categories, Faq, FinalCta, Hero, HowItWorks, OffersTeaser, OrderWays, Picks, Ticker, Visit } from "./home-sections";

/** The calm look: the home page as designed first. */
export function HomeMinimal() {
  return (
    <main>
      <Suspense fallback={<div className="min-h-[80svh]" />}>
        <Hero />
      </Suspense>
      <Ticker />
      <Suspense>
        <Categories />
        <Picks />
        <OrderWays />
      </Suspense>
      <HowItWorks />
      <Suspense>
        <Album />
        <Catering />
        <OffersTeaser />
        <Faq />
        <Visit />
      </Suspense>
      <FinalCta />
    </main>
  );
}
