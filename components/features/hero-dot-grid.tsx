"use client";

import React, { useEffect, useRef } from "react";

export function HeroDotGrid() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCoordRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      // Reduced motion: keep static dot grid, do not track mouse
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lastCoordRef.current = { x, y };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (lastCoordRef.current && containerRef.current) {
            containerRef.current.style.setProperty(
              "--mouse-x",
              `${lastCoordRef.current.x}px`
            );
            containerRef.current.style.setProperty(
              "--mouse-y",
              `${lastCoordRef.current.y}px`
            );
          }
          rafRef.current = null;
        });
      }
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.setProperty("--mouse-x", "-9999px");
        containerRef.current.style.setProperty("--mouse-y", "-9999px");
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      style={
        {
          "--mouse-x": "-9999px",
          "--mouse-y": "-9999px",
        } as React.CSSProperties
      }
    >
      {/* Base static dot grid layer */}
      <div 
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(244, 246, 248, 0.7) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Interactive cursor-following spotlight dot grid layer (amber accent, revealed via radial mask) */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(240, 169, 59, 0.85) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
          WebkitMaskImage: "radial-gradient(circle 180px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)",
          maskImage: "radial-gradient(circle 180px at var(--mouse-x) var(--mouse-y), black 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
