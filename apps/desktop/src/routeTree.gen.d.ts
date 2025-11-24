import { Route as rootRoute } from './routes/__root';
import { Route as IndexImport } from './routes/index';
import { Route as WorkflowsIndexImport } from './routes/workflows/index';
import { Route as WorkflowsEditorImport } from './routes/workflows/editor';
declare const WorkflowsImport: import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, import("@tanstack/react-router").RootRoute<import("@tanstack/react-router").Register, undefined, {}, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, string, string, "/workflows", string, undefined, import("@tanstack/react-router").ResolveParams<string>, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>;
declare module '@tanstack/react-router' {
    interface FileRoutesByPath {
        '/': {
            preLoaderRoute: typeof IndexImport;
            parentRoute: typeof rootRoute;
        };
        '/workflows': {
            preLoaderRoute: typeof WorkflowsImport;
            parentRoute: typeof rootRoute;
        };
        '/workflows/editor': {
            preLoaderRoute: typeof WorkflowsEditorImport;
            parentRoute: typeof WorkflowsImport;
        };
        '/workflows/': {
            preLoaderRoute: typeof WorkflowsIndexImport;
            parentRoute: typeof WorkflowsImport;
        };
    }
}
export declare const routeTree: import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, any, "/", "/", string, "__root__", undefined, {}, {}, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, readonly [import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, any, any, any, any, any, undefined, import("@tanstack/react-router").ResolveParams<any>, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, import("@tanstack/react-router").RootRoute<import("@tanstack/react-router").Register, undefined, {}, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, string, string, "/workflows", string, undefined, import("@tanstack/react-router").ResolveParams<string>, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, readonly [import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, any, any, any, any, any, undefined, import("@tanstack/react-router").ResolveParams<any>, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, import("@tanstack/router-core").Route<import("@tanstack/react-router").Register, any, any, any, any, any, undefined, import("@tanstack/react-router").ResolveParams<any>, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, import("@tanstack/react-router").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>], unknown, unknown, unknown, undefined>], unknown, unknown, unknown, undefined>;
export {};
//# sourceMappingURL=routeTree.gen.d.ts.map