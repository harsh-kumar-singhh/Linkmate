"use client"
import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function FloatingCard({ 
  children, 
  className, 
  delay = 0, 
  yOffset = 15, 
  duration = 4 
}: { 
  children: ReactNode
  className?: string
  delay?: number
  yOffset?: number
  duration?: number
}) {
  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      animate={{
        y: [0, -yOffset, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={cn("bg-secondary/10 backdrop-blur-xl border border-border shadow-premium rounded-2xl", className)}
    >
      {children}
    </MotionDiv>
  )
}
