"use client"
import { FloatingShape } from "./FloatingShape"

export function ConstellationBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -200 }}>
      {/* 1. Sphere (Very Large) - Top Right */}
      <FloatingShape
        type="sphere"
        sizeClass="w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
        className="top-[-5%] right-[-10%] md:right-[-5%] bg-gradient-to-bl from-[#EAF2FF] to-transparent opacity-[0.10] backdrop-blur-[100px]"
        yOffset={15}
        xOffset={8}
        duration={18}
        parallaxOffset={-60}
      />

      {/* 2. Rounded Cube (Medium Large) - Bottom Left */}
      <FloatingShape
        type="rounded_cube"
        sizeClass="w-[200px] h-[200px] md:w-[350px] md:h-[350px]"
        className="bottom-[-5%] left-[-10%] md:left-[-5%] bg-gradient-to-tr from-[#F2F4F7] to-[#F3F0FF] opacity-[0.08] backdrop-blur-[80px]"
        yOffset={10}
        xOffset={5}
        duration={22}
        delay={4}
        parallaxOffset={-30}
      />

      {/* 3. Ring (Large) - Behind center/hero, hidden on mobile */}
      <FloatingShape
        type="ring"
        sizeClass="hidden md:block md:w-[400px] md:h-[400px]"
        className="top-[25%] left-[20%] border-[30px] border-[#EAF2FF] opacity-[0.06] backdrop-blur-[120px] bg-transparent"
        yOffset={12}
        duration={16}
        delay={2}
        parallaxOffset={-90}
      />
    </div>
  )
}
