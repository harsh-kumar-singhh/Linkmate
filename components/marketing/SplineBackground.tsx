"use client"

import { SplineScene } from "@/components/ui/splite"

export function SplineBackground() {
  return (
    <>
      {/* Background Layer: The 3D Scene */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-1000">
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>

      {/* Overlay Layer: Background blur and softening */}
      <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-0 pointer-events-none" />
    </>
  )
}
