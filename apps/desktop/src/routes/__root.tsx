import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Sidebar } from '@/components/layout/sidebar'

function RootComponent() {
    const location = useLocation()
    const isIndex = location.pathname === '/'

    if (isIndex) {
        // 首页使用自己的布局，不显示侧边栏
        return (
            <>
                <Outlet />
                <TanStackRouterDevtools />
            </>
        )
    }

    // 其他页面使用侧边栏布局
    return (
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
    )
}

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: () => (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-zinc-400">页面未找到</p>
            </div>
        </div>
    ),
})
