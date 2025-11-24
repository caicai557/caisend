import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ipcListActiveInstances } from '@/lib/ipc';
export const Route = createFileRoute('/workflows/')({
    component: WorkflowList,
});
function WorkflowList() {
    const { data: instances, isLoading } = useQuery({
        queryKey: ['active-instances'],
        queryFn: ipcListActiveInstances,
        refetchInterval: 2000 // Poll every 2s for monitoring
    });
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Workflows" }), _jsx(Link, { to: "/workflows/editor", className: "bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90", children: "Create New Workflow" })] }), _jsx("div", { className: "grid gap-4", children: _jsxs("div", { className: "border rounded p-4", children: [_jsx("h2", { className: "font-semibold mb-4", children: "Active Instances" }), isLoading ? (_jsx("div", { children: "Loading..." })) : (_jsxs("div", { className: "space-y-2", children: [instances?.map(inst => (_jsxs("div", { className: "flex justify-between items-center p-3 border rounded bg-card", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: ["Contact: ", inst.contact_id] }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["ID: ", inst.id] })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm font-medium", children: inst.status }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["Node: ", inst.current_node_id] })] })] }, inst.id))), (!instances || instances.length === 0) && (_jsx("div", { className: "text-muted-foreground", children: "No active instances." }))] }))] }) })] }));
}
