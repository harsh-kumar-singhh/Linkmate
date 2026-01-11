import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive"
    size?: "default" | "sm" | "lg" | "icon"
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "default", isLoading, children, ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
                    {
                        "bg-blue-600 text-white hover:bg-blue-600/90 shadow-premium": variant === "primary",
                        "bg-secondary text-site-fg hover:bg-secondary/80": variant === "secondary",
                        "border border-blue-600/30 bg-transparent text-blue-600 hover:bg-blue-100 hover:border-blue-600": variant === "outline",
                        "text-blue-600 hover:bg-blue-100": variant === "ghost",
                        "text-blue-600 underline-offset-4 hover:underline": variant === "link",
                        "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
                        "h-10 px-4 py-2": size === "default",
                        "h-9 rounded-md px-3": size === "sm",
                        "h-11 rounded-full px-8": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
