"use client";

import React from "react";

export function AuroraWave() {
  return (
    <div 
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* SVG Curved Aurora Light Ribbon */}
      <svg
        className="absolute w-full h-[520px] left-0 bottom-[10%] md:bottom-[8%] lg:bottom-[5%]"
        viewBox="0 0 1440 520"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Aurora Gradient */}
          <linearGradient id="stitch-aurora-grad" x1="0%" y1="60%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#0EA5E9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.9" />
          </linearGradient>

          {/* Heavy Atmospheric Blur Filters */}
          <filter id="aurora-blur-heavy" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="75" />
          </filter>

          <filter id="aurora-blur-medium" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="30" />
          </filter>

          <filter id="aurora-blur-core" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* Layer 1: Wide Diffused Ambient Glow */}
        <path
          d="M -100 240 C 280 440, 520 450, 720 370 C 940 280, 1180 200, 1540 180"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="150"
          strokeLinecap="round"
          filter="url(#aurora-blur-heavy)"
          style={{ mixBlendMode: "screen", opacity: 0.75 }}
        />

        {/* Layer 2: Defined Radiant Ribbon Beam */}
        <path
          d="M -100 240 C 280 440, 520 450, 720 370 C 940 280, 1180 200, 1540 180"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="50"
          strokeLinecap="round"
          filter="url(#aurora-blur-medium)"
          style={{ mixBlendMode: "screen", opacity: 0.9 }}
        />

        {/* Layer 3: Intense Core Light Thread */}
        <path
          d="M -100 240 C 280 440, 520 450, 720 370 C 940 280, 1180 200, 1540 180"
          stroke="url(#stitch-aurora-grad)"
          strokeWidth="18"
          strokeLinecap="round"
          filter="url(#aurora-blur-core)"
          style={{ mixBlendMode: "screen", opacity: 0.95 }}
        />
      </svg>

      {/* Atmospheric Horizon Ambient Spread */}
      <div 
        className="absolute -left-20 top-1/2 -translate-y-1/3 w-[500px] h-[500px] rounded-full opacity-40 blur-[130px] pointer-events-none"
        style={{ background: "#9333EA", mixBlendMode: "screen" }}
      />
      <div 
        className="absolute -right-20 top-1/2 -translate-y-1/4 w-[550px] h-[550px] rounded-full opacity-40 blur-[140px] pointer-events-none"
        style={{ background: "#06B6D4", mixBlendMode: "screen" }}
      />
    </div>
  );
}
