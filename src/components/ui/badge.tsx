import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-white shadow-2xs",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-700",
        destructive:
          "border-rose-200/80 bg-rose-50 text-rose-700",
        outline:
          "border-zinc-200 text-zinc-700",
        crimson:
          "border-[#ea0543]/25 bg-[#ea0543]/10 text-[#ea0543]",
        indigo:
          "border-[#140a8e]/25 bg-[#140a8e]/10 text-[#140a8e]",
        success:
          "border-emerald-200/80 bg-emerald-50 text-emerald-700",
        warning:
          "border-amber-200/80 bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
