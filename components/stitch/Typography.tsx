import { ReactNode, ElementType } from "react"
import { cn } from "@/lib/utils"

interface HeadingProps {
  children: ReactNode
  level?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
  as?: ElementType
}

export function Heading({ children, level = 2, className, as }: HeadingProps) {
  const Tag = as || (`h${level}` as ElementType)
  
  const base = "font-bold tracking-tight text-balance"
  const sizes = {
    1: "text-6xl md:text-[8rem] font-bold tracking-tight leading-[0.9]",
    2: "text-4xl md:text-6xl font-black tracking-tighter leading-none",
    3: "text-3xl md:text-4xl leading-tight",
    4: "text-2xl font-bold",
    5: "text-xl font-bold",
    6: "text-lg font-bold",
  }
  
  return <Tag className={cn(base, sizes[level], className)}>{children}</Tag>
}

interface TextProps {
  children: ReactNode
  variant?: "lead" | "body" | "muted" | "small"
  className?: string
  as?: ElementType
}

export function Text({ children, className, variant = "body", as = "p" }: TextProps) {
  const Tag = as
  const variants = {
    lead: "text-xl md:text-2xl font-light leading-relaxed",
    body: "text-base md:text-lg leading-relaxed",
    muted: "text-muted-foreground leading-relaxed",
    small: "text-sm text-muted-foreground",
  }
  return <Tag className={cn(variants[variant], className)}>{children}</Tag>
}
