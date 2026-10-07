import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2a1d17", color: "#c9a25b", fontSize: 130, fontStyle: "italic", fontFamily: "serif" }}>P</div>
    ),
    size,
  );
}
