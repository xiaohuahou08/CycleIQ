import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #064e3b 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "rgba(16, 185, 129, 0.2)",
              border: "2px solid rgba(52, 211, 153, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                border: "3px solid #34d399",
              }}
            />
          </div>
          <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {SITE_NAME}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <p
            style={{
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            {SITE_TAGLINE}
          </p>
          <p style={{ fontSize: "26px", lineHeight: 1.45, color: "#cbd5e1", margin: 0 }}>
            {DEFAULT_DESCRIPTION.slice(0, 120)}…
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
