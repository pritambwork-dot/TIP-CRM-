import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer apple-tap select-none active:scale-98",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 active:bg-zinc-950",
        crimson:
          "bg-[#ea0543] text-white shadow-xs hover:bg-[#ad0633] active:bg-[#8f052a]",
        indigo:
          "bg-[#140a8e] text-white shadow-xs hover:bg-[#0d0663] active:bg-[#080442]",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700",
        outline:
          "border border-zinc-200/90 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900",
        secondary:
          "bg-[#f2f0f2] text-zinc-800 hover:bg-zinc-200/80",
        ghost:
          "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900",
        link:
          "text-[#140a8e] underline-offset-4 hover:underline hover:text-[#ea0543]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-5 text-sm",
        icon: "h-8.5 w-8.5 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
