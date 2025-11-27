import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
export const Route = createRootRoute({
    component: () => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p-2 flex gap-4 bg-gray-800 text-white items-center", children: [_jsx("div", { className: "font-bold text-lg px-2", children: "Teleflow" }), _jsx(Link, { to: "/dashboard", className: "hover:text-blue-300 [&.active]:text-blue-400", children: "Dashboard" }), _jsx(Link, { to: "/workflows", className: "hover:text-blue-300 [&.active]:text-blue-400", children: "Workflows" }), _jsx(Link, { to: "/workflows/editor", className: "hover:text-blue-300 [&.active]:text-blue-400", children: "Editor" })] }), _jsx(Outlet, {}), _jsx(TanStackRouterDevtools, {})] })),
});
