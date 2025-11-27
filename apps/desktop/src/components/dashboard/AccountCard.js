import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { User, Circle, Clock } from 'lucide-react';
export function AccountCard({ account, isSelected, onClick }) {
    const statusColor = {
        online: 'bg-green-500',
        offline: 'bg-gray-400',
        busy: 'bg-yellow-500',
        error: 'bg-red-500',
    }[account.status];
    const statusText = {
        online: '在线',
        offline: '离线',
        busy: '忙碌',
        error: '异常',
    }[account.status];
    return (_jsxs("div", { onClick: onClick, className: `p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-blue-300'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 rounded-full bg-gray-100", children: _jsx(User, { className: "w-4 h-4 text-gray-600" }) }), _jsx("span", { className: "font-medium text-gray-800", children: account.name })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${statusColor}` }), _jsx("span", { className: "text-xs text-gray-500", children: statusText })] })] }), _jsxs("div", { className: "space-y-1", children: [account.currentWorkflowId && (_jsxs("div", { className: "flex items-center gap-1.5 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded", children: [_jsx(Circle, { className: "w-3 h-3 animate-pulse" }), _jsxs("span", { children: ["\u6267\u884C\u4E2D: ", account.currentWorkflowId] })] })), _jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400 mt-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-3 h-3" }), _jsx("span", { children: new Date(account.lastActive).toLocaleTimeString() })] }), _jsxs("span", { children: [account.messageCount, " \u6D88\u606F"] })] })] })] }));
}
