import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as DashboardImport } from './routes/dashboard'

const IndexRoute = IndexImport.update({
    path: '/',
    getParentRoute: () => rootRoute,
} as any)

const DashboardRoute = DashboardImport.update({
    path: '/dashboard',
    getParentRoute: () => rootRoute,
} as any)

declare module '@tanstack/react-router' {
    interface FileRoutesByPath {
        '/': {
            id: '/'
            path: '/'
            fullPath: '/'
            preLoaderRoute: typeof IndexImport
            parentRoute: typeof rootRoute
        }
        '/dashboard': {
            id: '/dashboard'
            path: '/dashboard'
            fullPath: '/dashboard'
            preLoaderRoute: typeof DashboardImport
            parentRoute: typeof rootRoute
        }
    }
}

export const routeTree = rootRoute.addChildren([IndexRoute, DashboardRoute])
