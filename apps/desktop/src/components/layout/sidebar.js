import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Workflow, ChevronLeft, ChevronRight, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { GhostButton } from "@/components/ui/ghost-button";
const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Workflow, label: "Workflows", href: "/workflows" },
];
export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const location = useLocation();
    return (_jsxs(motion.div, { initial: { width: 240 }, animate: { width: isCollapsed ? 80 : 240 }, transition: { type: "spring", stiffness: 300, damping: 30 }, className: "relative h-screen border-r border-[var(--glass-border)] bg-[var(--bg-deep)]/50 backdrop-blur-xl z-50 flex flex-col", children: [_jsx("div", { className: "flex items-center h-16 px-4 border-b border-[var(--glass-border)]", children: _jsxs("div", { className: "flex items-center gap-3 overflow-hidden", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]", children: _jsx(Ghost, { className: "w-5 h-5" }) }), _jsx(AnimatePresence, { children: !isCollapsed && (_jsx(motion.span, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 }, className: "font-bold text-lg tracking-wider text-white whitespace-nowrap", children: "TELEFLOW" })) })] }) }), _jsx("div", { className: "flex-1 py-6 px-3 space-y-2", children: sidebarItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (_jsx(Link, { to: item.href, className: "block", children: _jsxs(GhostButton, { variant: isActive ? "default" : "ghost", className: cn("w-full justify-start", isCollapsed ? "px-0 justify-center" : "px-4"), children: [_jsx(item.icon, { className: cn("w-5 h-5", !isCollapsed && "mr-3") }), !isCollapsed && _jsx("span", { children: item.label })] }) }, item.href));
                }) }), _jsx("div", { className: "p-4 border-t border-[var(--glass-border)]", children: _jsx(GhostButton, { variant: "ghost", size: "icon", onClick: () => setIsCollapsed(!isCollapsed), className: "w-full flex items-center justify-center", children: isCollapsed ? _jsx(ChevronRight, { className: "w-4 h-4" }) : _jsx(ChevronLeft, { className: "w-4 h-4" }) }) })] }));
}
