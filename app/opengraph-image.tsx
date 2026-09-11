import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Droppr — Personal Airdrop Workspace & Mission Control";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0D1117",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -100,
            width: 550,
            height: 550,
            background:
              "radial-gradient(circle, rgba(240, 169, 59, 0.18) 0%, rgba(13, 17, 23, 0) 70%)",
          }}
        />

        {/* Brand header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "rgba(240, 169, 59, 0.2)",
              border: "1px solid rgba(240, 169, 59, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F0A93B",
              fontSize: 24,
              fontWeight: "bold",
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "2px",
            }}
          >
            DROPPR
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 20,
              background: "#1B212B",
              border: "1px solid #283241",
              color: "#9BA3AF",
              letterSpacing: "1px",
            }}
          >
            MISSION CONTROL
          </span>
        </div>

        {/* Center hero headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Personal Workspace for <br />
            <span style={{ color: "#F0A93B" }}>Crypto Airdrop Hunters</span>
          </h1>
          <p
            style={{
              fontSize: 22,
              color: "#9BA3AF",
              maxWidth: 900,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Track testnets, multi-wallet allocations, daily routine reset (07:00
            WIB), and auto-import Telegram alpha signals with complete privacy.
          </p>
        </div>

        {/* Bottom trust badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#161B22",
              border: "1px solid #283241",
              color: "#00E5FF",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            ✓ Zero Private Keys Required
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#161B22",
              border: "1px solid #283241",
              color: "#10B981",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            ✓ Telegram Alpha Signals
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: 10,
              background: "#161B22",
              border: "1px solid #283241",
              color: "#F0A93B",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            ✓ 07:00 WIB Daily Reset
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
