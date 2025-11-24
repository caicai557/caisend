import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ipcListActiveInstances } from '@/lib/ipc';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';
export const Route = createFileRoute('/workflows/')({
    component: WorkflowList,
});
function WorkflowList() {
    const { data: instances, isLoading, refetch } = useQuery({
        queryKey: ['active-instances'],
        queryFn: ipcListActiveInstances,
        refetchInterval: 3000 // Poll every 3s as fallback
    });
    // Real-time updates via Tauri Events
    useEffect(() => {
        const unlisten = listen('workflow-state-changed', () => {
            refetch();
        });
        return () => {
            unlisten.then(f => f());
        };
    }, [refetch]);
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Running':
                return _jsx(Activity, { className: "w-5 h-5 text-blue-500 animate-pulse" });
            case 'WaitingForResponse':
                return _jsx(Clock, { className: "w-5 h-5 text-yellow-500" });
            case 'Completed':
                return _jsx(CheckCircle, { className: "w-5 h-5 text-green-500" });
            default:
                return _jsx(AlertCircle, { className: "w-5 h-5 text-gray-500" });
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Running':
                return 'bg-blue-50 border-blue-200';
            case 'WaitingForResponse':
                return 'bg-yellow-50 border-yellow-200';
            case 'Completed':
                return 'bg-green-50 border-green-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Workflows" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Manage and monitor your conversational workflows" })] }), _jsx(Link, { to: "/workflows/editor", className: "bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium", children: "+ Create New Workflow" })] }), _jsx("div", { className: "grid gap-6", children: _jsxs("div", { className: "bg-white border border-gray-200 rounded-xl shadow-sm", children: [_jsx("div", { className: "border-b border-gray-200 p-4 bg-gray-50 rounded-t-xl", children: _jsxs("h2", { className: "font-semibold text-lg flex items-center gap-2", children: [_jsx(Activity, { className: "w-5 h-5 text-blue-600" }), "Active Instances", instances && _jsxs("span", { className: "text-sm font-normal text-gray-500", children: ["(", instances.length, ")"] })] }) }), _jsx("div", { className: "p-4", children: isLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Activity, { className: "w-6 h-6 animate-spin text-blue-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Loading workflows..." })] })) : (_jsxs("div", { className: "space-y-3", children: [instances?.map(inst => (_jsxs("div", { className: `flex justify-between items-center p-4 border rounded-lg transition-all hover:shadow-md ${getStatusColor(inst.status)}`, children: [_jsxs("div", { className: "flex items-center gap-4", children: [getStatusIcon(inst.status), _jsxs("div", { children: [_jsxs("div", { className: "font-medium text-gray-900", children: ["Contact: ", inst.contact_id.slice(0, 8), "..."] }), _jsxs("div", { className: "text-xs text-gray-600 mt-1", children: ["Workflow ID: ", inst.definition_id.slice(0, 8), "..."] })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm font-semibold text-gray-800", children: inst.status }), _jsx("div", { className: "text-xs text-gray-600 mt-1", children: inst.current_node_id ? `Node: ${inst.current_node_id}` : 'Completed' }), _jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Updated: ", new Date(inst.updated_at).toLocaleTimeString()] })] })] }, inst.id))), (!instances || instances.length === 0) && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Activity, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500 font-medium", children: "No active workflow instances" }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "Create a workflow and trigger it to see it here" })] }))] })) })] }) })] }));
}
