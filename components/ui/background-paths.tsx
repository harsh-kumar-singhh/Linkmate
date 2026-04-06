"use client";

import { useRef, useMemo } from "react";
import { motion } from "framer-motion";

// Path geometry computed once — outside render, stable reference
function buildPaths(position: number) {
  return Array.from({ length: 36 }, (_, i) => {
    const p = position;
    return {
      id: i,
      d: `M-${380 - i * 5 * p} -${189 + i * 6}C-${380 - i * 5 * p} -${
        189 + i * 6
      } -${312 - i * 5 * p} ${216 - i * 6} ${152 - i * 5 * p} ${
        343 - i * 6
      }C${616 - i * 5 * p} ${470 - i * 6} ${684 - i * 5 * p} ${
        875 - i * 6
      } ${684 - i * 5 * p} ${875 - i * 6}`,
      // Static stroke width — no runtime math in render
      width: 0.5 + i * 0.03,
      // Pre-compute duration with seeded values — no Math.random() in JSX
      duration: 25 + (i % 7) * 3,
      opacity: 0.08 + i * 0.005, // Max ~0.25 — keep it subtle
    };
  });
}

function FloatingPaths({
  position,
  color = "white",
}: {
  position: number;
  color?: string;
}) {
  // useMemo so paths are computed once at mount, not on every render
  const paths = useMemo(() => buildPaths(position), [position]);

  const stroke =
    color === "blue" ? "rgba(10,102,194,0.9)" : "rgba(255,255,255,0.9)";

  return (
    // KEY CHANGE: blur applied to the SVG wrapper, not per-path via filter=""
    // This gives you ONE compositor layer instead of 36 separate raster ops
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ filter: "blur(0.6px)" }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={stroke}
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            // KEY CHANGE: only animating opacity (composited) — no pathLength, no pathOffset
            // Opacity is GPU-composited. pathLength/pathOffset trigger layout recalc every frame.
            animate={{
              opacity: [path.opacity * 0.4, path.opacity, path.opacity * 0.4],
            }}
            transition={{
              duration: path.duration,
              repeat: Infinity,
              ease: "easeInOut",
              // Stagger start so paths don't all pulse in sync
              delay: (path.id * 0.4) % path.duration,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPathsLayer() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-black">
      {/* Radial glow — unchanged, cheap radial-gradient is fine */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(10,102,194,0.15)_0%,transparent_70%)]" />

      <FloatingPaths position={1} color="white" />
      <FloatingPaths position={-1} color="blue" />

      {/* Removed: backdrop-blur overlay — redundant compositing layer */}
      {/* Removed: feGaussianBlur filter on paths — moved to wrapper above */}
    </div>
  );
}