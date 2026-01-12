"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export type AnimationPreset =
  | "default"
  | "fade-in-up"
  | "fade-in-scale"
  | "stagger-container"
  | "slide-up"
  | "slide-up-sm"
  | "modal"
  | "backdrop"
  | "slide-right"
  | "none"

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "viewport"> {
  animation?: AnimationPreset
  delay?: number
  index?: number
  // viewport prop is custom boolean here, masking the original viewport object from Framer
  viewport?: boolean
}

// Define a local type to avoid "Variants not exported" error and satisfy TS access checks
type PresetConfig = {
  initial?: any
  animate?: any
  exit?: any
  whileInView?: any
  viewport?: any
  variants?: any
  transition?: any
}

const presets: Record<AnimationPreset, PresetConfig> = {
  "default": {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
  },
  "modal": {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 10 },
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
  },
  "backdrop": {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  "slide-right": {
    initial: { x: -10, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
  },
  "none": {
    initial: {},
    animate: {},
    transition: {}
  },
  "fade-in-up": {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  },
  "fade-in-scale": {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5 }
  },
  "stagger-container": {
    initial: "initial",
    animate: "animate",
    variants: {
      initial: {},
      animate: {
        transition: {
          staggerChildren: 0.1
        }
      }
    }
  },
  "slide-up": {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  "slide-up-sm": {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 }
  }
}

export function AnimatedCard({
  children,
  className,
  animation = "default",
  delay,
  index,
  viewport = false,
  layoutId,
  ...rest
}: AnimatedCardProps) {
  const preset = presets[animation]

  // Calculate final delay: explicit delay prop OR index-based delay, or 0
  const finalDelay = (delay || 0) + (index ? index * 0.1 : 0)

  // Merge delay into transition if needed
  const transition = {
    ...(preset.transition || {}),
    ...(finalDelay > 0 ? { delay: finalDelay } : {})
  }

  // Handle viewport vs animate
  const animationProps = viewport
    ? {
      initial: preset.initial,
      whileInView: preset.animate || preset.whileInView,
      viewport: preset.viewport || { once: true },
      variants: preset.variants
    }
    : {
      initial: preset.initial,
      animate: preset.animate,
      exit: preset.exit,
      variants: preset.variants
    }

  // If staggger-container, we don't want to override the orchestrator transition
  // usually, but here we just pass the transition if it exists on the preset props.
  // For stagger container, the transition is inside the 'animate' variant usually.

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(className)}
      {...animationProps}
      // Only apply transition override if it's not a stagger container (which has transition in variants)
      // or if we have a custom delay to inject
      {...(animation !== "stagger-container" ? { transition } : {})}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
