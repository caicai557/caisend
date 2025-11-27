import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
const GlassCard = React.forwardRef(({ className, hoverEffect = false, ...props }, ref) => {
    return (_jsx(motion.div, { ref: ref, initial: hoverEffect ? { opacity: 0, y: 10 } : {}, animate: hoverEffect ? { opacity: 1, y: 0 } : {}, whileHover: hoverEffect ? { y: -2, boxShadow: "0 10px 40px -10px rgba(0,240,255,0.1)" } : {}, className: cn("glass-panel rounded-xl p-6 transition-all duration-300", className), ...props }));
});
GlassCard.displayName = "GlassCard";
export { GlassCard };
