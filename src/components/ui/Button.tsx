"use client";

import * as React from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:brightness-110 active:brightness-95 shadow-[0_8px_20px_-10px_rgb(var(--brand))]",
  secondary: "border border-border bg-elevated text-fg hover:bg-brand/10",
  ghost: "text-muted hover:bg-brand/10 hover:text-fg",
  danger: "bg-negative text-white hover:brightness-110",
  success: "bg-positive text-white hover:brightness-110"
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10"
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
