"use client"

import { Suspense, lazy, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

// Core rule: Spline is static (z-index -20)
const Spline = lazy(() => import('@splinetool/react-spline'))

export function SplineBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isMobile, setIsMobile] = useState(false)

  // System Strategy: stiffness: 80, damping: 25 for fluid, organic motion
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 })

  // PERCEPTION PARALLAX: Two layers shifting at different intensities
  // Layer 1 (±40px) - Primary simulated depth
  const parallax1X = useTransform(springX, [-0.5, 0.5], [-40, 40])
  const parallax1Y = useTransform(springY, [-0.5, 0.5], [-40, 40])

  // Layer 2 (±20px) - Secondary subtle depth
  const parallax2X = useTransform(springX, [-0.5, 0.5], [-20, 20])
  const parallax2Y = useTransform(springY, [-0.5, 0.5], [-20, 20])

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    setIsMobile(isTouch)

    if (isTouch) return

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }

    const handleMouseLeave = () => {
      mouseX.set(0)
      mouseY.set(0)
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [mouseX, mouseY])

  return (
    <>
      {/* 1. Base Layer: Static Spline Scene */}
      <div className="fixed inset-0 -z-20 pointer-events-none bg-site-bg">
        <Suspense fallback={null}>
          <Spline 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* 2. Parallax Layer 1: Foreground Simulation (±40px) */}
      <motion.div 
        style={{ 
          x: isMobile ? 0 : parallax1X, 
          y: isMobile ? 0 : parallax1Y 
        }}
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        <div className="w-full h-full bg-gradient-to-tr from-black/40 via-transparent to-black/40 opacity-40 mix-blend-multiply" />
      </motion.div>

      {/* 3. Parallax Layer 2: Midground Depth (±20px) */}
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
          x: isMobile ? 0 : parallax2X, 
          y: isMobile ? 0 : parallax2Y 
        }}
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        {/* Subtle radial glow to enhance depth perception */}
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] opacity-30" />
        <div className="w-full h-full backdrop-blur-[1px] opacity-20" />
      </motion.div>

      {/* Atmospheric Global Layer: Restores aesthetics */}
      <div className="fixed inset-0 bg-site-bg/10 backdrop-blur-[1px] -z-10 pointer-events-none" />
    </>
  )
}
