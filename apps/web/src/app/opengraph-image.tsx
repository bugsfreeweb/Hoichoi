import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "হৈচৈ। — ভাইরাল বাংলা, সপ্তাহখানেক";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f3eee1",
          color: "#0a0c10",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 60,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 120, fontWeight: 900 }}>
          হৈচৈ<span style={{ color: "#d2202c" }}>।</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#4a4a4a", marginTop: 12 }}>
          HOICHOI · AUTO-CURATED NEWS DESK — ভাইরাল বাংলা, সপ্তাহখানেক
        </div>
        <div style={{ display: "flex", marginTop: 40, alignItems: "center", gap: 12 }}>
          <span style={{ background: "#d2202c", color: "#f3eee1", padding: "8px 20px", fontSize: 18, borderRadius: 999 }}>
            ISSN-AUTO-24
          </span>
          <span style={{ color: "#4a4a4a", fontSize: 18 }}>SYNCED · ৮ ঘণ্টায় একবার</span>
        </div>
      </div>
    ),
    { ...size },
  );
}