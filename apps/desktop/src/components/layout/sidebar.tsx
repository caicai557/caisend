import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    Workflow,
    ChevronLeft,
    ChevronRight,
    Ghost
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GhostButton } from "@/components/ui/ghost-button"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Workflow, label: "Workflows", href: "/workflows" },
]

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const location = useLocation()

    return (
        <motion.div
            initial={{ width: 240 }}
            animate={{ width: isCollapsed ? 80 : 240 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative h-screen border-r border-[var(--glass-border)] bg-[var(--bg-deep)]/50 backdrop-blur-xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center h-16 px-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                        <Ghost className="w-5 h-5" />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="font-bold text-lg tracking-wider text-white whitespace-nowrap"
                            >
                                TELEFLOW
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-2">
                {sidebarItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className="block"
                        >
                            <GhostButton
                                variant={isActive ? "default" : "ghost"}
                                className={cn(
                                    "w-full justify-start",
                                    isCollapsed ? "px-0 justify-center" : "px-4"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </GhostButton>
                        </Link>
                    )
                })}
            </div>

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-[var(--glass-border)]">
                <GhostButton
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </GhostButton>
            </div>
        </motion.div>
    )
}
