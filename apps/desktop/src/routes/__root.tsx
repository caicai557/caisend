import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Sidebar } from '@/components/layout/sidebar'

export const Route = createRootRoute({
    component: () => (
        <div className="flex h-screen w-full bg-[var(--bg-void)] text-[var(--text-primary)] overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto relative">
                {/* Background Ambient Glow */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--accent-primary)]/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[var(--accent-secondary)]/5 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 p-6 min-h-full">
                    <Outlet />
                </div>
            </main>
            <TanStackRouterDevtools />
        </div>
    ),
})
