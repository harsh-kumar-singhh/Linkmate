"use client";

// Zero Framer Motion. Zero JS animation. Zero layout recalc.
// Motion runs entirely via CSS @keyframes on stroke-dashoffset —
// the compositor thread handles it, main thread never touches it.

const WHITE_PATHS = [
  { d: "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",   dur: 28, delay: 0,   w: 0.50, o: 0.12 },
  { d: "M-385 -183C-385 -183 -317 222 147 349C611 476 679 881 679 881",   dur: 32, delay: -4,  w: 0.55, o: 0.10 },
  { d: "M-390 -177C-390 -177 -322 228 142 355C606 482 674 887 674 887",   dur: 26, delay: -8,  w: 0.50, o: 0.08 },
  { d: "M-395 -171C-395 -171 -327 234 137 361C601 488 669 893 669 893",   dur: 35, delay: -12, w: 0.60, o: 0.14 },
  { d: "M-400 -165C-400 -165 -332 240 132 367C596 494 664 899 664 899",   dur: 30, delay: -16, w: 0.50, o: 0.09 },
  { d: "M-370 -195C-370 -195 -302 210 157 337C621 464 689 869 689 869",   dur: 38, delay: -2,  w: 0.45, o: 0.11 },
  { d: "M-360 -201C-360 -201 -292 204 162 331C626 458 694 863 694 863",   dur: 24, delay: -6,  w: 0.50, o: 0.07 },
  { d: "M-350 -207C-350 -207 -282 198 167 325C631 452 699 857 699 857",   dur: 42, delay: -20, w: 0.55, o: 0.13 },
  { d: "M-340 -213C-340 -213 -272 192 172 319C636 446 704 851 704 851",   dur: 29, delay: -10, w: 0.50, o: 0.08 },
  { d: "M-330 -219C-330 -219 -262 186 177 313C641 440 709 845 709 845",   dur: 33, delay: -14, w: 0.45, o: 0.10 },
  { d: "M-320 -225C-320 -225 -252 180 182 307C646 434 714 839 714 839",   dur: 27, delay: -18, w: 0.60, o: 0.06 },
  { d: "M-310 -231C-310 -231 -242 174 187 301C651 428 719 833 719 833",   dur: 36, delay: -22, w: 0.50, o: 0.09 },
  { d: "M-300 -237C-300 -237 -232 168 192 295C656 422 724 827 724 827",   dur: 31, delay: -3,  w: 0.55, o: 0.11 },
  { d: "M-290 -243C-290 -243 -222 162 197 289C661 416 729 821 729 821",   dur: 25, delay: -7,  w: 0.50, o: 0.08 },
  { d: "M-280 -249C-280 -249 -212 156 202 283C666 410 734 815 734 815",   dur: 40, delay: -11, w: 0.45, o: 0.07 },
  { d: "M-270 -255C-270 -255 -202 150 207 277C671 404 739 809 739 809",   dur: 34, delay: -15, w: 0.50, o: 0.12 },
  { d: "M-260 -261C-260 -261 -192 144 212 271C676 398 744 803 744 803",   dur: 28, delay: -19, w: 0.55, o: 0.09 },
  { d: "M-250 -267C-250 -267 -182 138 217 265C681 392 749 797 749 797",   dur: 37, delay: -23, w: 0.50, o: 0.06 },
];

const BLUE_PATHS = [
  { d: "M380 -189C380 -189 312 216 -152 343C-616 470 -684 875 -684 875",  dur: 30, delay: -5,  w: 0.50, o: 0.18 },
  { d: "M385 -183C385 -183 317 222 -147 349C-611 476 -679 881 -679 881",  dur: 34, delay: -9,  w: 0.55, o: 0.15 },
  { d: "M390 -177C390 -177 322 228 -142 355C-606 482 -674 887 -674 887",  dur: 27, delay: -13, w: 0.50, o: 0.12 },
  { d: "M395 -171C395 -171 327 234 -137 361C-601 488 -669 893 -669 893",  dur: 38, delay: -1,  w: 0.60, o: 0.20 },
  { d: "M400 -165C400 -165 332 240 -132 367C-596 494 -664 899 -664 899",  dur: 31, delay: -17, w: 0.50, o: 0.14 },
  { d: "M370 -195C370 -195 302 210 -157 337C-621 464 -689 869 -689 869",  dur: 42, delay: -21, w: 0.45, o: 0.10 },
  { d: "M360 -201C360 -201 292 204 -162 331C-626 458 -694 863 -694 863",  dur: 26, delay: -25, w: 0.50, o: 0.16 },
  { d: "M350 -207C350 -207 282 198 -167 325C-631 452 -699 857 -699 857",  dur: 35, delay: -4,  w: 0.55, o: 0.13 },
  { d: "M340 -213C340 -213 272 192 -172 319C-636 446 -704 851 -704 851",  dur: 29, delay: -8,  w: 0.50, o: 0.11 },
  { d: "M330 -219C330 -219 262 186 -177 313C-641 440 -709 845 -709 845",  dur: 33, delay: -12, w: 0.45, o: 0.17 },
  { d: "M320 -225C320 -225 252 180 -182 307C-646 434 -714 839 -714 839",  dur: 28, delay: -16, w: 0.60, o: 0.12 },
  { d: "M310 -231C310 -231 242 174 -187 301C-651 428 -719 833 -719 833",  dur: 36, delay: -20, w: 0.50, o: 0.14 },
  { d: "M300 -237C300 -237 232 168 -192 295C-656 422 -724 827 -724 827",  dur: 32, delay: -24, w: 0.55, o: 0.09 },
  { d: "M290 -243C290 -243 222 162 -197 289C-661 416 -729 821 -729 821",  dur: 25, delay: -2,  w: 0.50, o: 0.15 },
  { d: "M280 -249C280 -249 212 156 -202 283C-666 410 -734 815 -734 815",  dur: 40, delay: -6,  w: 0.45, o: 0.11 },
  { d: "M270 -255C270 -255 202 150 -207 277C-671 404 -739 809 -739 809",  dur: 34, delay: -10, w: 0.50, o: 0.16 },
  { d: "M260 -261C260 -261 192 144 -212 271C-676 398 -744 803 -744 803",  dur: 29, delay: -14, w: 0.55, o: 0.12 },
  { d: "M250 -267C250 -267 182 138 -217 265C-681 392 -749 797 -749 797",  dur: 37, delay: -18, w: 0.50, o: 0.10 },
];

// Inline styles for the keyframe — injected once, no runtime cost
const KEYFRAME_STYLE = `
  @keyframes travel {
    from { stroke-dashoffset: 2000; }
    to   { stroke-dashoffset: -2000; }
  }
`;

function SpiralLayer({
  paths,
  stroke,
}: {
  paths: typeof WHITE_PATHS;
  stroke: string;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      // Single blur on the SVG element = 1 GPU texture, not N textures
      style={{ filter: "blur(0.5px)" }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={stroke}
          strokeWidth={p.w}
          strokeOpacity={p.o}
          strokeDasharray="300 1700"
          style={{
            animation: `travel ${p.dur}s linear ${p.delay}s infinite`,
            willChange: "stroke-dashoffset",
          }}
        />
      ))}
    </svg>
  );
}

export function BackgroundPathsLayer() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-black">
      {/* Inject keyframe once — no library needed */}
      <style>{KEYFRAME_STYLE}</style>

      {/* Radial glow — static, zero cost */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(10,102,194,0.15)_0%,transparent_70%)]" />

      {/* White spirals */}
      <SpiralLayer paths={WHITE_PATHS} stroke="rgba(255,255,255,0.9)" />

      {/* Blue spirals (mirrored) */}
      <SpiralLayer paths={BLUE_PATHS} stroke="rgba(10,102,194,0.9)" />

      {/* No backdrop-blur overlay — removed */}
    </div>
  );
}