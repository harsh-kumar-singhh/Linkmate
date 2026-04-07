"use client";

const KEYFRAMES = `
@keyframes dash-flow {
  0% { stroke-dashoffset: 500; }
  100% { stroke-dashoffset: 0; }
}

@keyframes opacity-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

type PathDef = {
  d: string;
  dur: number;
  delay: number;
  opacity: number;
  width: number;
};

// 🔥 Generate dense, layered flow (like source code)
function generatePaths(direction: "down" | "up"): PathDef[] {
  const paths: PathDef[] = [];

  for (let i = 0; i < 28; i++) {
    const offset = i * 18;

    const d = direction === "down"
      ? `M${-300 + offset} ${900}
         C${100 + offset} ${600},
          ${500 + offset} ${300},
          ${1200 + offset} ${-200}`
      : `M${-300 + offset} ${-200}
         C${100 + offset} ${200},
          ${500 + offset} ${600},
          ${1200 + offset} ${900}`;

    paths.push({
      d,
      dur: 8 + (i % 6) * 2,              // 🔥 faster variation
      delay: -i * 1.2,
      opacity: 0.05 + i * 0.015,         // 🔥 gradual visibility layering
      width: 0.4 + i * 0.015,            // 🔥 thickness variation
    });
  }

  return paths;
}

const WHITE_PATHS = generatePaths("down");
const BLUE_PATHS = generatePaths("up");

function FlowLayer({
  paths,
  stroke,
  reverse = false,
}: {
  paths: PathDef[];
  stroke: string;
  reverse?: boolean;
}) {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
      viewBox="0 0 1200 800"
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
          strokeDasharray="100 400"
          style={{
            animation: `
              dash-flow ${p.dur}s linear ${p.delay}s infinite,
              opacity-pulse ${p.dur * 1.5}s ease-in-out ${p.delay}s infinite
            `,
            animationDirection: reverse ? "reverse" : "normal",
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

      {/* subtle center glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.12) 0%, transparent 70%)",
        }}
      />

      {/* WHITE FLOW */}
      <FlowLayer
        paths={WHITE_PATHS}
        stroke="rgba(255,255,255,0.9)"
      />

      {/* BLUE FLOW (reverse) */}
      <FlowLayer
        paths={BLUE_PATHS}
        stroke="rgba(10,102,194,0.9)"
        reverse
      />
    </div>
  );
}