import { ImageResponse } from "next/og";

export const alt = "Platter Cafe & Restro, Jhalana, Jaipur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card for links on WhatsApp, Instagram, Google and others.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#2a1d17", color: "#fbf6ef", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", fontSize: 40, letterSpacing: 8, color: "#c9a25b", textTransform: "uppercase", fontFamily: "sans-serif" }}>Jhalana, Jaipur</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, lineHeight: 1, fontStyle: "italic", color: "#c9a25b" }}>Platter</div>
          <div style={{ display: "flex", fontSize: 54, marginTop: 24 }}>Cafe &amp; Restro. Coffee, food, and a table that&apos;s waiting.</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#d9cbbd", fontFamily: "sans-serif" }}>Dine in · Takeaway · Delivery · Open daily 11 AM to 10:30 PM</div>
      </div>
    ),
    size,
  );
}
