"use client"

import { SplineScene } from "@/components/ui/splite"
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion"
import { useEffect, useState } from "react"

export function SplineBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isMobile, setIsMobile] = useState(false)

  // Refined springs: stiffness: 80, damping: 25
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 })

  // Sublte rotation mapping (±5 degrees for depth)
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5])

  useEffect(() => {
    // Detect mobile/touch devices
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    setIsMobile(isTouch)

    if (isTouch) return

    let timeoutId: NodeJS.Timeout

    const handleMouseMove = (e: MouseEvent) => {
      // Clear any existing reset timeout
      if (timeoutId) clearTimeout(timeoutId)

      // Normalize mouse position from -0.5 to 0.5
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)

      // Center Stabilization: Reset to 0 after 2 seconds of inactivity
      timeoutId = setTimeout(() => {
        animate(mouseX, 0, { duration: 1.5, ease: "easeInOut" })
        animate(mouseY, 0, { duration: 1.5, ease: "easeInOut" })
      }, 2000)
    }

    const handleMouseLeave = () => {
      animate(mouseX, 0, { duration: 1.5, ease: "easeInOut" })
      animate(mouseY, 0, { duration: 1.5, ease: "easeInOut" })
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [mouseX, mouseY])

  return (
    <>
      <motion.div 
        animate={isMobile ? {
          y: [0, -5, 0],
          transition: {
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }
        } : {}}
        style={{ 
          rotateX: isMobile ? 0 : rotateX, 
          rotateY: isMobile ? 0 : rotateY,
          perspective: 1000
        }}
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-1000"
      >
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </motion.div>

      {/* Overlay Layer: Optimized gradient-based overlay ONLY */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/10 to-black/30 z-0 pointer-events-none" />
    </>
  )
}
