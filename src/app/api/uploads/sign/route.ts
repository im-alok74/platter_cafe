import { NextResponse } from "next/server";
import { z } from "zod";
import { assertStaff } from "@/lib/admin/auth";
import { IMAGE_KINDS, signUpload } from "@/lib/cloudinary";

// Signs a Cloudinary upload for a signed-in owner or manager. The API secret stays on the server.
export async function POST(request: Request) {
  try {
    await assertStaff();
  } catch {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const body = z.object({ kind: z.enum(IMAGE_KINDS) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json(signUpload(body.data.kind), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Uploads are not configured" }, { status: 503 });
  }
}
