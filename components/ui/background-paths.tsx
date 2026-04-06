"use client";

// CSS keyframes for smooth infinite flow
const KEYFRAMES = `
  @keyframes dash-travel {
    0%   { stroke-dashoffset: 800; }
    100% { stroke-dashoffset: 0; }
  }
`;

// Structured path groups (not random chaos)
const WHITE_PATHS = [
  { d: "M-200 900 C100 600 400 400 600 200 C800 0 1000 -100 1400 -200", dur: 14, delay: 0 },
  { d: "M-150 950 C150 650 450 420 640 230 C830 40 1050 -80 1450 -180", dur: 18, delay: -4 },
  { d: "M-250 850 C50 560 360 380 570 180 C780 -20 980 -110 1380 -210", dur: 12, delay: -8 },
  { d: "M-100 1000 C200 700 480 480 680 270 C880 70 1080 -50 1480 -150", dur: 20, delay: -2 },
  { d: "M-300 800 C0 510 320 350 530 150 C740 -50 940 -140 1340 -240", dur: 16, delay: -6 },
  { d: "M-50 980 C250 680 520 460 710 255 C900 50 1100 -40 1500 -140", dur: 13, delay: -10 },
];

const BLUE_PATHS = [
  { d: "M-200 -100 C100 150 400 350 650 500 C900 650 1100 750 1400 900", dur: 16, delay: -2 },
  { d: "M-150 -150 C150 100 440 310 690 460 C940 610 1130 720 1430 870", dur: 19, delay: -5 },
  { d: "M-250 -50 C50 200 360 390 610 540 C860 690 1060 790 1360 930", dur: 14, delay: -9 },
  { d: "M-100 -200 C200 60 480 270 730 420 C980 570 1180 680 1480 830", dur: 18, delay: -3 },
  { d: "M-300 -80 C0 170 320 370 580 520 C840 670 1040 780 1340 920", dur: 20, delay: -7 },
  { d: "M-50 -180 C250 80 530 290 770 445 C1010 600 1200 710 1500 860", dur: 15, delay: -11 },
];

type PathDef = { d: string; dur: number; delay: number };

function SpiralLayer({
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
          strokeWidth={0.5}
          strokeOpacity={opacity}
          strokeDasharray="120 600"
          style={{
            animation: `dash-travel ${p.dur}s linear ${p.delay}s infinite`,
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
        background: "black",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Subtle radial blue glow (very light) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.06) 0%, transparent 70%)",
        }}
      />

      {/* White layer (forward flow) */}
      <SpiralLayer
        paths={WHITE_PATHS}
        stroke="rgba(255,255,255,0.9)"
        opacity={0.10}
      />

      {/* Blue layer (reverse flow for depth) */}
      <SpiralLayer
        paths={BLUE_PATHS}
        stroke="rgba(10,102,194,0.9)"
        opacity={0.18}
        reverse
      />
    </div>
  );
}