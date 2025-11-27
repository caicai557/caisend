import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDashboardStore } from '@/stores/dashboardStore';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
export function ExecutionLogList({ accountId }) {
    const logs = useDashboardStore(state => accountId
        ? state.logs.filter(l => l.accountId === accountId)
        : state.logs);
    if (logs.length === 0) {
        return (_jsx("div", { className: "p-8 text-center text-gray-400 text-sm", children: "\u6682\u65E0\u6267\u884C\u65E5\u5FD7" }));
    }
    return (_jsx("div", { className: "divide-y divide-gray-100", children: logs.map((log) => (_jsx("div", { className: "p-3 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "mt-0.5", children: [log.status === 'success' && _jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }), log.status === 'failed' && _jsx(XCircle, { className: "w-4 h-4 text-red-500" }), log.status === 'running' && _jsx(Clock, { className: "w-4 h-4 text-blue-500 animate-spin" })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-gray-800 font-medium truncate", children: log.message }), _jsxs("div", { className: "flex items-center gap-2 mt-1 text-xs text-gray-400", children: [_jsx("span", { children: new Date(log.timestamp).toLocaleTimeString() }), _jsx("span", { children: "\u2022" }), _jsx("span", { className: "font-mono", children: log.nodeId })] })] })] }) }, log.id))) }));
}
