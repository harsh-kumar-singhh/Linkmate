import { ReactNode, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  variant?: "default" | "subtle" | "dark" | "gradient"
  padding?: "none" | "sm" | "md" | "lg" | "xl"
}

export function Section({
  children,
  className,
  variant = "default",
  padding = "lg",
  ...props
}: SectionProps) {
  const baseStyles = "relative w-full overflow-hidden"
  
  const variants = {
    default: "bg-site-bg text-site-fg",
    subtle: "bg-secondary/30 text-site-fg",
    dark: "bg-primary text-primary-foreground",
    gradient: "bg-gradient-to-b from-site-bg to-secondary/20",
  }
  
  const paddings = {
    none: "",
    sm: "py-12 px-6",
    md: "py-20 px-6",
    lg: "py-32 px-6",
    xl: "py-48 px-6",
  }

  return (
    <section 
      className={cn(baseStyles, variants[variant], paddings[padding], className)} 
      {...props}
    >
      {children}
    </section>
  )
}
