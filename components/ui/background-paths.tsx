"use client";

const KEYFRAMES = `
  @keyframes travel {
    0%   { stroke-dashoffset: 1; }
    100% { stroke-dashoffset: -1; }
  }
`;

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
      dur: 20 + (i % 8) * 2,
      delay: -(i * 2.5),
    };
  });
}

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
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="-100 -400 896 1200"
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