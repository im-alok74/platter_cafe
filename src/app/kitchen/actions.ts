"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

/** Marks a dish sold out or back in stock from the kitchen, and refreshes the public menu straight away. */
export async function setSoldOut(itemId: string, soldOut: boolean) {
  await assertStaff(["owner", "manager", "kitchen"]);
  const { error } = await (await createClient()).rpc("set_item_sold_out", { p_item: z.uuid().parse(itemId), p_sold_out: soldOut });
  if (error) throw new Error("Could not update that dish.");
  updateTag("menu");
}
