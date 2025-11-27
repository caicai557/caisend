import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

interface GlassCardProps extends HTMLMotionProps<"div"> {
    hoverEffect?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hoverEffect = false, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={hoverEffect ? { opacity: 0, y: 10 } : {}}
                animate={hoverEffect ? { opacity: 1, y: 0 } : {}}
                whileHover={hoverEffect ? { y: -2, boxShadow: "0 10px 40px -10px rgba(0,240,255,0.1)" } : {}}
                className={cn(
                    "glass-panel rounded-xl p-6 transition-all duration-300",
                    className
                )}
                {...props}
            />
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
