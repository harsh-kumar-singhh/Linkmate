"use client";

// Zero Framer Motion. Zero JS animation.
// pathLength="1" normalizes each path to unit length.
// stroke-dasharray="0.15 0.85" = 15% dash, 85% gap (in normalized units).
// Animating dashoffset 1 → -1 travels the dash exactly one full loop.
// This is the CSS equivalent of Framer Motion's pathOffset: [0, 1, 0].

const KEYFRAMES = `
  @keyframes travel {
    0%   { stroke-dashoffset: 1; }
    100% { stroke-dashoffset: -1; }
  }
`;

// Exact same S-curve formula as the original source.
// position=1 → white paths sweeping one direction
// position=-1 → blue paths sweeping the mirror direction
function buildPaths(position: number) {
  return Array.from({ length: 18 }, (_, i) => {
    const p = position;
    return {
      d: `M-${380 - i * 5 * p} -${189 + i * 6}C-${380 - i * 5 * p} -${
        189 + i * 6
      } -${312 - i * 5 * p} ${216 - i * 6} ${152 - i * 5 * p} ${
        343 - i * 6
      }C${616 - i * 5 * p} ${470 - i * 6} ${684 - i * 5 * p} ${
        875 - i * 6
      } ${684 - i * 5 * p} ${875 - i * 6}`,
      width: 0.5 + i * 0.03,
      opacity: 0.1 + (i % 6) * 0.03,
      // Staggered durations — no Math.random(), deterministic
      dur: 20 + (i % 8) * 2,
      delay: -(i * 2.5),
    };
  });
}

// Pre-built at module level — computed once, never on re-render
const WHITE_PATHS = buildPaths(1);
const BLUE_PATHS  = buildPaths(-1);

function SpiralLayer({
  paths,
  stroke,
}: {
  paths: ReturnType<typeof buildPaths>;
  stroke: string;
}) {
  return (
    // viewBox matches the original exactly — critical for path coords
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={stroke}
          strokeWidth={p.width}
          strokeOpacity={p.opacity}
          // pathLength="1" normalizes this path to unit length.
          // dasharray/dashoffset values are now in 0–1 space.
          pathLength="1"
          strokeDasharray="0.15 0.85"
          style={{
            animation: `travel ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}

export function BackgroundPathsLayer() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -10,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#0B0F14",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Static radial glow — zero animation cost */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.15) 0%, transparent 70%)",
        }}
      />

      <SpiralLayer paths={WHITE_PATHS} stroke="rgba(255,255,255,0.9)" />
      <SpiralLayer paths={BLUE_PATHS}  stroke="rgba(10,102,194,0.9)"  />
    </div>
  );
}