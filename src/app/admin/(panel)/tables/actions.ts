"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

// 8 URL-safe characters (48 bits): unguessable, short enough for a clean QR.
const newCode = () => randomBytes(6).toString("base64url");
const done = () => {
  updateTag("benches");
  revalidatePath("/admin/tables");
};

export async function addTable(label: string) {
  const staff = await assertStaff();
  const db = await createClient();
  const name = z.string().trim().min(1).max(40).parse(label);
  // Next number is max + 1; if two staff add a table at once, one hits the unique (cafe_id, number) and tries again.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await db.from("benches").select("number").eq("cafe_id", staff.cafeId).order("number", { ascending: false }).limit(1);
    const { error } = await db.from("benches").insert({ cafe_id: staff.cafeId, number: (data?.[0]?.number ?? 0) + 1, label: name, code: newCode() });
    if (!error) return done();
    if (error.code !== "23505") break;
  }
  throw new Error("Could not add the table.");
}

export async function renameTable(id: string, label: string) {
  await assertStaff();
  const { error } = await (await createClient()).from("benches").update({ label: z.string().trim().min(1).max(40).parse(label) }).eq("id", z.uuid().parse(id));
  if (error) throw new Error("Could not rename the table.");
  done();
}

export async function setTableActive(id: string, active: boolean) {
  await assertStaff();
  const { error } = await (await createClient()).from("benches").update({ active }).eq("id", z.uuid().parse(id));
  if (error) throw new Error("Could not update the table.");
  done();
}

/** New QR code for a table. The old printed QR stops working straight away. */
export async function rotateTableCode(id: string) {
  await assertStaff();
  const { error } = await (await createClient()).from("benches").update({ code: newCode() }).eq("id", z.uuid().parse(id));
  if (error) throw new Error("Could not change the QR code.");
  done();
}
