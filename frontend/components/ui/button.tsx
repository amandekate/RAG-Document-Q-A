import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "icon" && "h-11 w-11",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-blue-700",
        variant === "secondary" && "border border-primary/70 bg-transparent text-primary hover:bg-primary/10",
        variant === "ghost" && "bg-transparent text-slate-600 hover:bg-muted dark:text-slate-300 dark:hover:bg-white/5",
        variant === "danger" && "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40",
        className
      )}
      {...props}
    />
  );
}
