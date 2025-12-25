
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: 'default' | 'secondary' | 'outline' | 'ghost'
    size?: 'default' | 'sm' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        const variants = {
            default: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl active:scale-95",
            secondary: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-900 hover:from-blue-200 hover:to-cyan-200 shadow-md hover:shadow-lg active:scale-95",
            outline: "border-2 border-blue-400 text-blue-700 bg-white/50 hover:bg-blue-50 hover:border-blue-500 shadow-sm hover:shadow-md active:scale-95",
            ghost: "text-blue-700 hover:bg-blue-50 active:scale-95"
        }
        const sizes = {
            default: "h-10 px-4 py-2 text-sm",
            sm: "h-8 px-3 py-1 text-xs",
            lg: "h-12 px-6 py-3 text-base"
        }
        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
