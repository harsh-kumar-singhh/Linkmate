"use client";

const KEYFRAMES = `
@keyframes dash-flow {
  0% { stroke-dashoffset: 600; }
  100% { stroke-dashoffset: 0; }
}
`;

type PathDef = { d: string; dur: number; delay: number };

// 🔥 CORE: generate patterned curves instead of random ones
function generatePaths(direction: "down" | "up"): PathDef[] {
  const paths: PathDef[] = [];

  for (let i = 0; i < 18; i++) {
    const offset = i * 30;

    const startX = -200 + offset;
    const startY = direction === "down" ? 900 : -100;

    const cp1X = 200 + offset;
    const cp1Y = direction === "down" ? 600 : 200;

    const cp2X = 600 + offset;
    const cp2Y = direction === "down" ? 200 : 600;

    const endX = 1200 + offset;
    const endY = direction === "down" ? -200 : 900;

    const d = `M${startX} ${startY} C${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

    paths.push({
      d,
      dur: 10 + (i % 5) * 2,     // 🔥 controlled variation
      delay: -i * 1.5,           // 🔥 staggered flow
    });
  }

  return paths;
}

const WHITE_PATHS = generatePaths("down");
const BLUE_PATHS = generatePaths("up");

function FlowLayer({
  paths,
  stroke,
  opacity,
  reverse = false,
}: {
  paths: PathDef[];
  stroke: string;
  opacity: number;
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
          strokeWidth={0.6}
          strokeOpacity={opacity}
          strokeDasharray="140 500"
          style={{
            animation: `dash-flow ${p.dur}s linear ${p.delay}s infinite`,
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

      {/* subtle glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.10) 0%, transparent 70%)",
        }}
      />

      {/* forward flow */}
      <FlowLayer
        paths={WHITE_PATHS}
        stroke="rgba(255,255,255,0.12)"
        opacity={1}
      />

      {/* reverse flow */}
      <FlowLayer
        paths={BLUE_PATHS}
        stroke="rgba(10,102,194,0.22)"
        opacity={1}
        reverse
      />
    </div>
  );
}