import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Sidebar } from '@/components/layout/sidebar';
export const Route = createRootRoute({
    component: () => (_jsxs("div", { className: "flex h-screen w-full bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden", children: [_jsx(Sidebar, {}), _jsxs("main", { className: "flex-1 overflow-auto relative", children: [_jsxs("div", { className: "fixed top-0 left-0 w-full h-full pointer-events-none z-0", children: [_jsx("div", { className: "absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--accent-primary)]/5 rounded-full blur-[100px]" }), _jsx("div", { className: "absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[var(--accent-secondary)]/5 rounded-full blur-[100px]" })] }), _jsx("div", { className: "relative z-10 p-6 min-h-full", children: _jsx(Outlet, {}) })] }), _jsx(TanStackRouterDevtools, {})] })),
});
