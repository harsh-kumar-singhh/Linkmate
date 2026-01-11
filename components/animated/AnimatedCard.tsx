"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export type AnimatedCardProps = HTMLMotionProps<"div"> & {
  className?: string
}

export function AnimatedCard({
  children,
  className,
  ...motionProps
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(className)}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}
