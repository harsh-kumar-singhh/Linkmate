"use client"
import { motion, useScroll, useTransform } from "framer-motion"

export type ShapeType = "sphere" | "rounded_cube" | "ring"

export function FloatingShape({
  type,
  className,
  sizeClass,
  yOffset = 10,
  xOffset = 5,
  duration = 15,
  delay = 0,
  parallaxOffset = -50
}: {
  type: ShapeType
  className?: string
  sizeClass?: string
  yOffset?: number
  xOffset?: number
  duration?: number
  delay?: number
  parallaxOffset?: number
}) {
  const { scrollY } = useScroll()
  
  // Very subtle parallax mapping
  const yParallax = useTransform(scrollY, [0, 1000], [0, parallaxOffset])
  
  let shapeStyle = {}
  if (type === "sphere") {
     shapeStyle = { borderRadius: "50%" }
  } else if (type === "rounded_cube") {
     shapeStyle = { borderRadius: "25%" }
  } else if (type === "ring") {
     shapeStyle = { borderRadius: "50%", borderStyle: "solid" }
  }

  const MotionDiv = motion.div as any;
  const ParallaxDiv = motion.div as any;

  return (
    <ParallaxDiv className="absolute" style={{ y: yParallax }}>
      <MotionDiv
        animate={{
          y: [0, -yOffset, 0],
          x: [0, xOffset, 0, -xOffset, 0],
          rotate: type === "rounded_cube" ? [0, 3, 0, -3, 0] : 0,
        }}
        transition={{
          y: { duration, repeat: Infinity, ease: "easeInOut", delay },
          x: { duration: duration * 1.5, repeat: Infinity, ease: "easeInOut", delay: delay + 1 },
          rotate: { duration: duration * 2, repeat: Infinity, ease: "easeInOut", delay }
        }}
        className={`${className} ${sizeClass}`}
        style={shapeStyle}
      />
    </ParallaxDiv>
  )
}
