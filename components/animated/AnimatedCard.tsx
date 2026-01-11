"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export type AnimatedCardProps = HTMLMotionProps<"div">

export function AnimatedCard({
  children,
  className,
  initial = { opacity: 0, scale: 0.98 },
  animate = { opacity: 1, scale: 1 },
  transition = { duration: 0.3 },
  ...rest
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
