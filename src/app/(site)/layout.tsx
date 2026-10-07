import { Suspense, type ReactNode } from "react";
import { MotionProvider } from "@/components/motion";
import { CartHost } from "@/components/order/cart-host";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSettings, templateOf } from "@/lib/data/site";

async function Cart() {
  const s = await getSettings();
  return <CartHost gstPercent={s.tax.gst_percent} whatsapp={s.contact.whatsapp} delivery={s.delivery} deliveryEnabled={s.flags.delivery} />;
}

/** Marks the page with the chosen look so CSS and components can switch. `contents` keeps layout untouched. */
async function Look({ children }: { children: ReactNode }) {
  const t = templateOf(await getSettings());
  return <div data-template={t} className="contents">{children}</div>;
}

function SiteBody({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground">
        Skip to content
      </a>
      <Suspense>
        <SiteHeader />
      </Suspense>
      <div id="content" className="flex-1">{children}</div>
      <Suspense>
        <SiteFooter />
      </Suspense>
      <Suspense>
        <Cart />
      </Suspense>
    </>
  );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <Suspense fallback={null}>
        <Look>
          <SiteBody>{children}</SiteBody>
        </Look>
      </Suspense>
    </MotionProvider>
  );
}
