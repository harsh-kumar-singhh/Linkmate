"use client";

const KEYFRAMES = `
@keyframes dash-flow {
  0% { stroke-dashoffset: 400; }
  100% { stroke-dashoffset: 0; }
}

@keyframes opacity-pulse {
  0%, 100% { opacity: 0.6; }
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

function generatePaths(direction: "down" | "up"): PathDef[] {
  const paths: PathDef[] = [];

  for (let i = 0; i < 20; i++) {
    const offset = i * 20;

    const d = direction === "down"
      ? `M${-200 + offset} 900 C${200 + offset} 600, ${600 + offset} 300, ${1200 + offset} -200`
      : `M${-200 + offset} -200 C${200 + offset} 200, ${600 + offset} 600, ${1200 + offset} 900`;

    paths.push({
      d,
      dur: 8 + (i % 4) * 2,
      delay: -i * 1.2,
      opacity: 0.15 + i * 0.02,   // 🔥 MUCH MORE VISIBLE
      width: 0.8 + i * 0.02,      // 🔥 THICKER LINES
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
          strokeDasharray="80 200"   // 🔥 SHORTER → MORE MOTION
          style={{
            animation: `
              dash-flow ${p.dur}s linear ${p.delay}s infinite,
              opacity-pulse ${p.dur * 1.2}s ease-in-out ${p.delay}s infinite
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

      {/* Stronger glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.18) 0%, transparent 70%)",
        }}
      />

      {/* WHITE FLOW */}
      <FlowLayer
        paths={WHITE_PATHS}
        stroke="rgba(255,255,255,0.9)"
      />

      {/* BLUE FLOW */}
      <FlowLayer
        paths={BLUE_PATHS}
        stroke="rgba(10,102,194,0.9)"
        reverse
      />
    </div>
  );
}