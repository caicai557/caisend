import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
export const Route = createRootRoute({
    component: () => (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-2 flex gap-2" }), _jsx("hr", {}), _jsx(Outlet, {}), _jsx(TanStackRouterDevtools, {})] })),
});
