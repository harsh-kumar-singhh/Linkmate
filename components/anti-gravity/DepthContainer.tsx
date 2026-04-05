"use client"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DepthContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div 
      className={cn("relative", className)}
      style={{ perspective: "1200px" }}
    >
      {children}
    </div>
  )
}

export function DepthLayer({ children, className, z = 0 }: { children: ReactNode, className?: string, z?: number }) {
  return (
    <div 
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)} 
      style={{ 
        transform: `translateZ(${z}px)`,
        transformStyle: "preserve-3d" 
      }}
    >
      {children}
    </div>
  )
}
