import { Beans, SplitText, Steam } from "@/components/fx/fx";

/** Espresso band at the top of every inner page. In the expressive look the title rises letter by letter, with steam and beans. */
export function PageHeader({ eyebrow, title, narrow, children }: { eyebrow: string; title: string; narrow?: boolean; children?: React.ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden bg-espresso text-[#fbf6ef]">
      <div className="fx-only"><Beans count={4} /></div>
      <div className={`relative mx-auto ${narrow ? "max-w-2xl" : "max-w-5xl"} px-4 pb-9 pt-9 md:pb-12 md:pt-12 [[data-template=expressive]_&]:pb-12 [[data-template=expressive]_&]:pt-14`}>
        <Steam className="fx-only absolute right-6 top-6 h-20 w-14 text-[#fbf6ef]/70 md:right-0 md:h-28 md:w-20" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        <h1 className="display mt-2 text-5xl md:text-6xl [[data-template=expressive]_&]:text-6xl [[data-template=expressive]_&]:leading-[0.95] md:[[data-template=expressive]_&]:text-8xl">
          <SplitText text={title} />
        </h1>
        {children && <p className="mt-3 max-w-xl text-lg leading-relaxed text-[#d9cbbd]">{children}</p>}
      </div>
    </header>
  );
}
