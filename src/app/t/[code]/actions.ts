"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type PlaceResult = { ok: true; id: string } | { ok: false; error: string };

const line = z.object({
  item_id: z.uuid(),
  variant_id: z.uuid().nullable(),
  addon_ids: z.array(z.uuid()).max(10),
  qty: z.number().int().min(1).max(20),
  note: z.string().max(120),
});

const input = z.object({
  code: z.string().min(4).max(40).nullable(),
  orderType: z.enum(["dine_in", "takeaway", "delivery"]),
  tableHint: z.string().trim().max(20).optional(),
  deliveryAddress: z.string().trim().max(300).optional(),
  deliveryKm: z.number().min(0).max(100).optional(),
  deliveryLat: z.number().min(-90).max(90).optional(),
  deliveryLng: z.number().min(-180).max(180).optional(),
  name: z.string().trim().max(60),
  phone: z.string().trim().max(16),
  note: z.string().trim().max(300),
  key: z.string().min(8).max(80),
  lines: z.array(line).min(1).max(40),
});

// Only messages we raise ourselves (SQLSTATE P0001) are shown to guests. Anything else is a bug and stays private.
const friendly = (e: { code?: string; message: string }) => (e.code === "P0001" ? e.message : "We could not place your order. Please try again or ask the staff.");

/** The server sends only ids and quantities. The database prices the order, so nothing here can set a price. */
export async function placeOrder(raw: z.input<typeof input>): Promise<PlaceResult> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Something in your order looks wrong. Please check it and try again." };
  const phone = p.data.phone && toE164(p.data.phone);
  if (phone === null) return { ok: false, error: "Enter a valid 10-digit mobile number." };
  if (!rateLimit(`order:${await clientIp()}`, 10, 10 * 60_000)) return { ok: false, error: "Too many orders from here. Please wait a few minutes or ask the staff." };
  // Uses the visitor's own session (if signed in), so a database trigger can link the order to their account.
  const { data, error } = await (await createClient()).rpc("place_order", {
    p_bench_code: p.data.code ?? "",
    p_order_type: p.data.orderType,
    p_payment_method: "counter",
    p_name: p.data.name,
    p_phone: phone,
    p_note: p.data.note,
    p_key: p.data.key,
    p_lines: p.data.lines,
    p_table_hint: p.data.tableHint ?? null,
    p_delivery_address: p.data.deliveryAddress ?? null,
    p_delivery_km: p.data.deliveryKm ?? null,
    p_delivery_lat: p.data.deliveryLat ?? null,
    p_delivery_lng: p.data.deliveryLng ?? null,
  });
  if (error) return { ok: false, error: friendly(error) };
  return { ok: true, id: (data as { id: string }).id };
}

export async function requestService(code: string, kind: "waiter" | "bill"): Promise<{ ok: boolean; error?: string }> {
  const p = z.object({ code: z.string().min(4).max(40), kind: z.enum(["waiter", "bill"]) }).safeParse({ code, kind });
  if (!p.success) return { ok: false, error: "Bad request" };
  const { error } = await createPublicClient().rpc("request_service", { p_code: p.data.code, p_kind: p.data.kind });
  return error ? { ok: false, error: friendly(error) } : { ok: true };
}
