"use client";

import React from "react";

export function AuroraWave() {
  return (
    <div 
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* SVG Curved Aurora Light Ribbon - Full inset with overflow-visible to eliminate hard clipping */}
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Aurora Gradient */}
          <linearGradient id="stitch-aurora-grad" x1="0%" y1="70%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#0EA5E9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.9" />
          </linearGradient>

          {/* Heavy Atmospheric Blur Filters with generous bounds to prevent edge clipping */}
          <filter id="aurora-blur-heavy" x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur stdDeviation="90" />
          </filter>

          <filter id="aurora-blur-medium" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="36" />
          </filter>

          <filter id="aurora-blur-core" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Layer 1: Wide Diffused Ambient Glow - sweeps smoothly across bottom-left */}
        <path
          d="M -120 540 C 260 760, 520 740, 720 620 C 940 500, 1180 400, 1560 380"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="180"
          strokeLinecap="round"
          filter="url(#aurora-blur-heavy)"
          style={{ mixBlendMode: "screen", opacity: 0.85 }}
        />

        {/* Layer 2: Defined Radiant Ribbon Beam */}
        <path
          d="M -120 540 C 260 760, 520 740, 720 620 C 940 500, 1180 400, 1560 380"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="60"
          strokeLinecap="round"
          filter="url(#aurora-blur-medium)"
          style={{ mixBlendMode: "screen", opacity: 0.95 }}
        />

        {/* Layer 3: Intense Core Light Thread */}
        <path
          d="M -120 540 C 260 760, 520 740, 720 620 C 940 500, 1180 400, 1560 380"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="20"
          strokeLinecap="round"
          filter="url(#aurora-blur-core)"
          style={{ mixBlendMode: "screen", opacity: 1 }}
        />
      </svg>

      {/* Atmospheric Horizon & Bottom-Left Bleed - guarantees smooth, unclipped gradient down into footer */}
      <div 
        className="absolute -left-20 bottom-0 w-[600px] h-[500px] rounded-full opacity-50 blur-[130px] pointer-events-none"
        style={{ background: "#9333EA", mixBlendMode: "screen" }}
      />
      <div 
        className="absolute -right-20 top-1/2 -translate-y-1/4 w-[600px] h-[550px] rounded-full opacity-45 blur-[140px] pointer-events-none"
        style={{ background: "#06B6D4", mixBlendMode: "screen" }}
      />
    </div>
  );
}
