"use client"

import { Suspense, lazy, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

// Core rule: Spline should be closer to the motion div for optimal transform performance
const Spline = lazy(() => import('@splinetool/react-spline'))

export function SplineBackground() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isMobile, setIsMobile] = useState(false)

  // System Strategy: stiffness: 80, damping: 25 for fluid, organic motion
  const springX = useSpring(mouseX, { stiffness: 80, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 25 })

  // Refined Perspective: Reduced to ±5 degrees for elite, subtle depth
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5])

  // Fallback / Layered Parallax: Small translation added for additional depth
  const translateX = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const translateY = useTransform(springY, [-0.5, 0.5], [-10, 10])

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
          x: isMobile ? 0 : translateX,
          y: isMobile ? 0 : translateY,
          transformPerspective: 1000,
          transformStyle: "preserve-3d"
        }}
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        <Suspense fallback={null}>
          <Spline 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        </Suspense>
      </motion.div>

      {/* Global Environmental Overlay: Restored design consistency */}
      <div className="fixed inset-0 bg-gradient-to-at from-black/40 via-transparent to-black/40 z-0 pointer-events-none opacity-60 mix-blend-multiply" />
      <div className="fixed inset-0 bg-site-bg/20 backdrop-blur-[2px] z-0 pointer-events-none" />
    </>
  )
}
