"use client"

import { SplineScene } from "@/components/ui/splite"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"

export function SplineBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth springs for non-jittery movement
  const springX = useSpring(mouseX, { stiffness: 50, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 30 })

  // Sublte rotation mapping (±2 degrees for extreme subtlety)
  const rotateX = useTransform(springY, [-0.5, 0.5], [2, -2])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-2, 2])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position from -0.5 to 0.5
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <>
      {/* Background Layer: The 3D Scene with Subtle Cursor Tilt */}
      <motion.div 
        style={{ 
          rotateX, 
          rotateY,
          perspective: 1000
        }}
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-1000"
      >
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </motion.div>

      {/* Overlay Layer: Background blur and softening */}
      <div className="fixed inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm z-0 pointer-events-none" />
    </>
  )
}
