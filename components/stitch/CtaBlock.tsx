import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CtaBlockProps {
  title: ReactNode
  description?: ReactNode
  actions: ReactNode
  className?: string
  align?: "left" | "center" 
}

export function CtaBlock({ title, description, actions, className, align = "center" }: CtaBlockProps) {
  const alignments = {
    left: "items-start text-left",
    center: "items-center text-center mx-auto"
  }

  return (
    <div className={cn("flex flex-col space-y-8 max-w-3xl", alignments[align], className)}>
      <div className="space-y-4 text-balance w-full">
        {title}
        {description && <div className={cn("w-full", align === "center" && "mx-auto")}>{description}</div>}
      </div>
      <div className={cn("flex flex-col sm:flex-row gap-4 pt-4 w-full", align === "center" ? "justify-center" : "justify-start")}>
        {actions}
      </div>
    </div>
  )
}
