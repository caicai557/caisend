import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { HTMLMotionProps } from "framer-motion";
declare const buttonVariants: (props?: ({
    variant?: "default" | "ghost" | "danger" | "glass" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref">, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}
declare const GhostButton: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export { GhostButton, buttonVariants };
//# sourceMappingURL=ghost-button.d.ts.map