import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
    component: () => (
        <>
            <div className="p-2 flex gap-4 bg-gray-800 text-white items-center">
                <div className="font-bold text-lg px-2">Teleflow</div>
                <Link to="/dashboard" className="hover:text-blue-300 [&.active]:text-blue-400">
                    Dashboard
                </Link>
                <Link to="/workflows" className="hover:text-blue-300 [&.active]:text-blue-400">
                    Workflows
                </Link>
                <Link to="/workflows/editor" className="hover:text-blue-300 [&.active]:text-blue-400">
                    Editor
                </Link>
            </div>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
})
