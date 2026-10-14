import * as React from "react"
import { cn } from "../../lib/utils"

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'crimson' | 'indigo' | 'success' | 'warning';

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "border-transparent bg-zinc-900 text-white shadow-2xs",
  secondary: "border-transparent bg-zinc-100 text-zinc-700",
  destructive: "border-rose-200/80 bg-rose-50 text-rose-700",
  outline: "border-zinc-200 text-zinc-700",
  crimson: "border-[#ea0543]/25 bg-[#ea0543]/10 text-[#ea0543]",
  indigo: "border-[#140a8e]/25 bg-[#140a8e]/10 text-[#140a8e]",
  success: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200/80 bg-amber-50 text-amber-700",
};

export function badgeVariants({ variant = 'default', className = '' }: { variant?: BadgeVariant; className?: string } = {}) {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
    badgeVariantClasses[variant] || badgeVariantClasses.default,
    className
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
