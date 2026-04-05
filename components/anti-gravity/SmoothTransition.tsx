"use client"
import { ReactNode } from "react"
import { motion } from "framer-motion"

interface SmoothTransitionProps {
  children: ReactNode
  delay?: number
  className?: string
  direction?: "up" | "down" | "left" | "right"
  distance?: number
}

export function SmoothTransition({ 
  children, 
  delay = 0, 
  className,
  direction = "up",
  distance = 30
}: SmoothTransitionProps) {
  const directions = {
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  }
  
  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      initial={{ opacity: 0, x: directions[direction].x, y: directions[direction].y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </MotionDiv>
  )
}
