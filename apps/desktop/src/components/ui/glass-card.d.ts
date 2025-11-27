import * as React from "react";
import { HTMLMotionProps } from "framer-motion";
interface GlassCardProps extends HTMLMotionProps<"div"> {
    hoverEffect?: boolean;
}
declare const GlassCard: React.ForwardRefExoticComponent<Omit<GlassCardProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
export { GlassCard };
//# sourceMappingURL=glass-card.d.ts.map