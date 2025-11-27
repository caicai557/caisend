import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group", {
    variants: {
        variant: {
            default: "bg-[var(--accent-primary)] text-black shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] hover:bg-[var(--accent-primary)]/90",
            ghost: "bg-transparent text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)] hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]",
            danger: "bg-[var(--accent-danger)] text-white shadow-[0_0_10px_rgba(255,0,60,0.3)] hover:shadow-[0_0_20px_rgba(255,0,60,0.6)]",
            glass: "bg-[var(--glass-surface)] text-white border border-[var(--glass-border)] hover:bg-[var(--glass-highlight)] hover:border-white/20 backdrop-blur-md",
        },
        size: {
            default: "h-9 px-4 py-2",
            sm: "h-8 rounded-md px-3 text-xs",
            lg: "h-10 rounded-md px-8",
            icon: "h-9 w-9",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const GhostButton = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    return (_jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: cn(buttonVariants({ variant, size, className })), ref: ref, ...props, children: [_jsx("span", { className: "relative z-10 flex items-center gap-2", children: props.children }), (variant === 'default' || variant === 'ghost') && (_jsx("div", { className: "absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" }))] }));
});
GhostButton.displayName = "GhostButton";
export { GhostButton, buttonVariants };
