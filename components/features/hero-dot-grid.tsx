"use client";

import React, { useEffect, useRef } from "react";

interface Dot {
  originX: number;
  originY: number;
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export function HeroDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReducedMotion = mediaQuery.matches;

    let animationFrameId: number;
    let dots: Dot[] = [];
    const SPACING = 26;
    const INFLUENCE_RADIUS = 160;
    const MAX_PUSH = 16;
    const BASE_RADIUS = 1.1;
    const MAX_RADIUS = 3.0;
    const BASE_ALPHA = 0.16;
    const MAX_ALPHA = 0.95;

    const mouse = { x: -9999, y: -9999, active: false };
    let isSettled = false;

    const initGrid = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      dots = [];
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      const offsetX = (width - (cols - 1) * SPACING) / 2;
      const offsetY = (height - (rows - 1) * SPACING) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = offsetX + c * SPACING;
          const originY = offsetY + r * SPACING;
          dots.push({
            originX,
            originY,
            x: originX,
            y: originY,
            radius: BASE_RADIUS,
            alpha: BASE_ALPHA,
          });
        }
      }
      isSettled = false;
    };

    initGrid();

    // Render loop
    const render = () => {
      if (prefersReducedMotion) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(244, 246, 248, ${BASE_ALPHA})`;
        for (const dot of dots) {
          ctx.beginPath();
          ctx.arc(dot.originX, dot.originY, BASE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let hasMovement = false;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        let targetX = dot.originX;
        let targetY = dot.originY;
        let targetRadius = BASE_RADIUS;
        let targetAlpha = BASE_ALPHA;

        if (mouse.active) {
          const dx = mouse.x - dot.originX;
          const dy = mouse.y - dot.originY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < INFLUENCE_RADIUS && dist > 0) {
            // Smooth cubic falloff for tactile push effect
            const norm = 1 - dist / INFLUENCE_RADIUS;
            const power = norm * norm;

            // Push outward away from mouse cursor
            const angle = Math.atan2(dy, dx);
            targetX = dot.originX - Math.cos(angle) * (power * MAX_PUSH);
            targetY = dot.originY - Math.sin(angle) * (power * MAX_PUSH);

            // Grow size and glow intensity
            targetRadius = BASE_RADIUS + power * (MAX_RADIUS - BASE_RADIUS);
            targetAlpha = BASE_ALPHA + power * (MAX_ALPHA - BASE_ALPHA);
          }
        }

        // Smooth physics interpolation (easing back)
        dot.x += (targetX - dot.x) * 0.15;
        dot.y += (targetY - dot.y) * 0.15;
        dot.radius += (targetRadius - dot.radius) * 0.15;
        dot.alpha += (targetAlpha - dot.alpha) * 0.15;

        if (
          Math.abs(targetX - dot.x) > 0.02 ||
          Math.abs(targetY - dot.y) > 0.02 ||
          Math.abs(targetRadius - dot.radius) > 0.02
        ) {
          hasMovement = true;
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);

        if (dot.radius > BASE_RADIUS + 0.25) {
          // Dynamic warm amber accent glow near cursor
          ctx.fillStyle = `rgba(240, 169, 59, ${dot.alpha})`;
        } else {
          // Default subtle obsidian grid dot
          ctx.fillStyle = `rgba(244, 246, 248, ${dot.alpha})`;
        }
        ctx.fill();
      }

      if (mouse.active || hasMovement) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        isSettled = true;
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;

      if (isSettled) {
        isSettled = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
      if (isSettled) {
        isSettled = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleResize = () => {
      initGrid();
      if (isSettled) {
        isSettled = false;
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1] w-full h-full"
      aria-hidden="true"
    />
  );
}

