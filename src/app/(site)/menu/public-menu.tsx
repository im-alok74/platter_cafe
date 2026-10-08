"use client";
import { cartUi } from "@/lib/cart-ui";
import type { MenuCategory } from "@/lib/data/menu";
import { useOrdering } from "@/lib/use-ordering";
import { MenuBrowser } from "./menu-browser";

/** The public menu with ADD buttons. Items go into the same cart as the table menu. */
export function PublicMenu({ categories, summary }: { categories: MenuCategory[]; summary: string }) {
  const ordering = useOrdering(cartUi.openItem);
  return <MenuBrowser categories={categories} ordering={ordering} summary={summary} reveal />;
}
