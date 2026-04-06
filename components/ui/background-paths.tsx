"use client";

import { motion } from "framer-motion";

function FloatingPaths({ position, color = "white" }: { position: number, color?: string }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.8 + i * 0.05, // Slightly thicker paths
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full"
                viewBox="0 0 696 316"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
            >
                <title>Background Paths</title>
                <defs>
                   <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feComposite in="SourceGraphic" in2="blur" operator="over" />
                   </filter>
                </defs>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke={color === "blue" ? "#0A66C2" : "rgba(255, 255, 255, 0.8)"}
                        strokeWidth={path.width}
                        strokeOpacity={0.2 + path.id * 0.02} // Increased opacity (20% to 92%)
                        filter="url(#glow)"
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.4, 0.8, 0.4],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 25 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
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
            {/* Subtle primary glow in the center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(10,102,194,0.15)_0%,transparent_70%)]" />
            
            <FloatingPaths position={1} color="white" />
            <FloatingPaths position={-1} color="blue" />
            
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        </div>
    );
}
