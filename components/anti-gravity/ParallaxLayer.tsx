"use client"
import { ReactNode, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

interface ParallaxLayerProps {
  children: ReactNode
  offset?: number
  className?: string
  priority?: boolean // If true, disable parallax for performance if needed, but here we just keep it simple
}

export function ParallaxLayer({ children, offset = 50, className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset])

  return (
    <motion.div ref={ref} style={{ y } as any} className={className}>
      {children}
    </motion.div>
  )
}
