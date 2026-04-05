"use client"
import { FloatingShape } from "./FloatingShape"

export function ConstellationBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* 1. Sphere (Very Large) - Top Right */}
      <FloatingShape
        type="sphere"
        sizeClass="w-[300px] h-[300px] md:w-[600px] md:h-[600px]"
        className="top-[-10%] right-[-10%] md:right-[-5%] bg-gradient-to-bl from-[#EAF2FF] to-transparent opacity-[0.80] blur-[100px]"
        yOffset={15}
        xOffset={8}
        duration={18}
        parallaxOffset={-60}
      />

      {/* 2. Rounded Cube (Medium Large) - Bottom Left */}
      <FloatingShape
        type="rounded_cube"
        sizeClass="w-[200px] h-[200px] md:w-[450px] md:h-[450px]"
        className="bottom-[-5%] left-[-10%] md:left-[-5%] bg-gradient-to-tr from-[#F2F4F7] to-[#F3F0FF] opacity-[0.90] blur-[80px]"
        yOffset={10}
        xOffset={5}
        duration={22}
        delay={4}
        parallaxOffset={-30}
      />

      {/* 3. Ring (Large) - Behind center/hero, hidden on mobile */}
      <FloatingShape
        type="ring"
        sizeClass="hidden md:block md:w-[500px] md:h-[500px]"
        className="top-[30%] left-[20%] border-[40px] border-[#EAF2FF] opacity-[0.40] blur-[40px] bg-transparent"
        yOffset={12}
        duration={16}
        delay={2}
        parallaxOffset={-90}
      />
    </div>
  )
}
