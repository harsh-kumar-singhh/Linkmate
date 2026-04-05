import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: "sm" | "default" | "lg" | "xl"
}

export function Container({ children, className, size = "default" }: ContainerProps) {
  const sizes = {
    sm: "max-w-3xl",
    default: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
  }
  return <div className={cn("mx-auto", sizes[size], className)}>{children}</div>
}

interface GridProps {
  children: ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4
  gap?: "sm" | "default" | "lg" | "xl"
}

export function Grid({ children, className, cols = 1, gap = "default" }: GridProps) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }
  const gaps = {
    sm: "gap-8",
    default: "gap-12 md:gap-16",
    lg: "gap-16 md:gap-24",
    xl: "gap-20 md:gap-32",
  }
  return <div className={cn("grid", colsClass[cols], gaps[gap], className)}>{children}</div>
}

interface FlexProps {
  children: ReactNode
  className?: string
  direction?: "row" | "col"
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
  gap?: "none" | "sm" | "md" | "lg" | "xl"
}

export function Flex({ 
  children, 
  className, 
  direction = "row", 
  align = "center", 
  justify = "start", 
  gap = "md" 
}: FlexProps) {
  const directions = { row: "flex-row", col: "flex-col" }
  const aligns = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }
  const justifies = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between", around: "justify-around" }
  const gaps = { none: "gap-0", sm: "gap-4", md: "gap-8", lg: "gap-12", xl: "gap-16" }

  return (
    <div className={cn("flex", directions[direction], aligns[align], justifies[justify], gaps[gap], className)}>
      {children}
    </div>
  )
}
