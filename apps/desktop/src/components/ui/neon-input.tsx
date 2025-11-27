import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const NeonInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false)

        return (
            <div className="relative group">
                <input
                    type={type}
                    className={cn(
                        "flex h-9 w-full rounded-md bg-[var(--bg-surface)] border border-[var(--glass-border)] px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)] relative z-10",
                        className
                    )}
                    ref={ref}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
                {/* Animated Glow Border */}
                <motion.div
                    animate={{ opacity: isFocused ? 1 : 0 }}
                    className="absolute -inset-[1px] rounded-md bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-0 blur-sm transition-opacity duration-300 -z-0 pointer-events-none"
                />
            </div>
        )
    }
)
NeonInput.displayName = "NeonInput"

export { NeonInput }
