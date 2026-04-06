"use client";

// No Framer Motion. Pure CSS @keyframes on stroke-dashoffset.
// Paths are sized for a full 1200x800 viewport coordinate space.

const KEYFRAMES = `
  @keyframes dash-travel {
    0%   { stroke-dashoffset: 3000; }
    100% { stroke-dashoffset: 0; }
  }
`;

const WHITE_PATHS = [
  { d: "M-200 900 C100 600 400 400 600 200 C800 0 1000 -100 1400 -200",    dur: 22, delay: 0   },
  { d: "M-150 950 C150 650 450 420 640 230 C830 40 1050 -80 1450 -180",    dur: 28, delay: -5  },
  { d: "M-250 850 C50 560 360 380 570 180 C780 -20 980 -110 1380 -210",    dur: 18, delay: -10 },
  { d: "M-100 1000 C200 700 480 480 680 270 C880 70 1080 -50 1480 -150",   dur: 32, delay: -3  },
  { d: "M-300 800 C0 510 320 350 530 150 C740 -50 940 -140 1340 -240",     dur: 25, delay: -8  },
  { d: "M-50 980 C250 680 520 460 710 255 C900 50 1100 -40 1500 -140",     dur: 35, delay: -15 },
  { d: "M-350 820 C-50 530 280 360 490 170 C700 -30 900 -120 1300 -220",   dur: 20, delay: -18 },
  { d: "M-180 870 C120 570 420 390 620 195 C820 0 1020 -90 1420 -190",     dur: 40, delay: -22 },
  { d: "M-220 920 C80 620 380 410 590 215 C800 20 1000 -70 1400 -170",     dur: 24, delay: -12 },
];

const BLUE_PATHS = [
  { d: "M-200 -100 C100 150 400 350 650 500 C900 650 1100 750 1400 900",   dur: 26, delay: -2  },
  { d: "M-150 -150 C150 100 440 310 690 460 C940 610 1130 720 1430 870",   dur: 33, delay: -7  },
  { d: "M-250 -50 C50 200 360 390 610 540 C860 690 1060 790 1360 930",     dur: 21, delay: -13 },
  { d: "M-100 -200 C200 60 480 270 730 420 C980 570 1180 680 1480 830",    dur: 30, delay: -4  },
  { d: "M-300 -80 C0 170 320 370 580 520 C840 670 1040 780 1340 920",      dur: 38, delay: -17 },
  { d: "M-50 -180 C250 80 530 290 770 445 C1010 600 1200 710 1500 860",    dur: 23, delay: -20 },
  { d: "M-350 -30 C-50 220 280 400 540 555 C800 710 1000 820 1300 960",    dur: 29, delay: -9  },
  { d: "M-180 -120 C120 140 420 340 660 490 C900 640 1100 750 1400 895",   dur: 36, delay: -25 },
  { d: "M-220 -70 C80 180 380 375 630 525 C880 675 1080 785 1380 925",     dur: 19, delay: -6  },
];

type PathDef = { d: string; dur: number; delay: number };

function SpiralLayer({ paths, stroke, opacity }: { paths: PathDef[]; stroke: string; opacity: number }) {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: "blur(0.6px)",
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
          strokeDasharray="250 2750"
          style={{
            animation: `dash-travel ${p.dur}s linear ${p.delay}s infinite`,
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

      {/* Radial blue glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(10,102,194,0.15) 0%, transparent 70%)",
        }}
      />

      <SpiralLayer paths={WHITE_PATHS} stroke="rgba(255,255,255,0.9)" opacity={0.13} />
      <SpiralLayer paths={BLUE_PATHS}  stroke="rgba(10,102,194,0.9)"  opacity={0.45} />
    </div>
  );
}