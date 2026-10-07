import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [32, 192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const px = Number(await id);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2a1d17", color: "#c9a25b", fontSize: px * 0.72, fontStyle: "italic", fontFamily: "serif", borderRadius: px * 0.22 }}>P</div>
    ),
    { width: px, height: px },
  );
}
