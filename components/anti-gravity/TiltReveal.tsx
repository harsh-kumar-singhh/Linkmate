"use client"
import { ReactNode, useRef } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

interface TiltRevealProps {
  children: ReactNode
  className?: string
  depth?: number
  scale?: number
}

export function TiltReveal({ children, className, depth = 10, scale = 1.02 }: TiltRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 })
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [depth, -depth])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-depth, depth])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      } as any}
      className={className}
    >
      {children}
    </MotionDiv>
  )
}
