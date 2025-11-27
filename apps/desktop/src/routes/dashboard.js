import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Activity, Users, FileText, Play } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { ExecutionLogList } from '@/components/dashboard/ExecutionLogList';
import { WorkflowMonitor } from '@/components/dashboard/WorkflowMonitor';
export const Route = createFileRoute('/dashboard')({
    component: DashboardPage,
});
function DashboardPage() {
    const { accounts, selectedAccountId, selectAccount, fetchInitialData, subscribeToEvents } = useDashboardStore();
    // 初始化数据和事件监听
    useEffect(() => {
        fetchInitialData();
        const unsubscribePromise = subscribeToEvents();
        return () => {
            unsubscribePromise.then(unlisten => unlisten());
        };
    }, []);
    return (_jsxs("div", { className: "h-screen flex flex-col bg-gray-100", children: [_jsxs("div", { className: "h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm", children: [_jsxs("h1", { className: "text-xl font-bold text-gray-800 flex items-center gap-2", children: [_jsx(Activity, { className: "w-5 h-5 text-blue-600" }), "\u519B\u673A\u5904 - \u76D1\u63A7\u4E2D\u5FC3"] }), _jsxs("div", { className: "flex gap-4 text-sm text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Users, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u5728\u7EBF\u8D26\u53F7: ", accounts.filter(a => a.status === 'online' || a.status === 'busy').length] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Play, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u8FD0\u884C\u4E2D\u5DE5\u4F5C\u6D41: ", accounts.filter(a => a.currentWorkflowId).length] })] })] })] }), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsxs("div", { className: "w-80 bg-white border-r border-gray-200 flex flex-col", children: [_jsx("div", { className: "p-4 border-b border-gray-100", children: _jsx("h2", { className: "font-semibold text-gray-700", children: "\u8D26\u53F7\u72B6\u6001" }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-3", children: accounts.map(account => (_jsx(AccountCard, { account: account, isSelected: selectedAccountId === account.id, onClick: () => selectAccount(account.id) }, account.id))) })] }), _jsx("div", { className: "flex-1 bg-gray-50 relative", children: selectedAccountId ? (_jsx(WorkflowMonitor, { accountId: selectedAccountId })) : (_jsx("div", { className: "absolute inset-0 flex items-center justify-center text-gray-400", children: _jsxs("div", { className: "text-center", children: [_jsx(Activity, { className: "w-12 h-12 mx-auto mb-2 opacity-50" }), _jsx("p", { children: "\u9009\u62E9\u5DE6\u4FA7\u8D26\u53F7\u4EE5\u67E5\u770B\u5B9E\u65F6\u5DE5\u4F5C\u6D41" })] }) })) }), _jsxs("div", { className: "w-80 bg-white border-l border-gray-200 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-100 flex items-center gap-2", children: [_jsx(FileText, { className: "w-4 h-4 text-gray-500" }), _jsx("h2", { className: "font-semibold text-gray-700", children: "\u6267\u884C\u65E5\u5FD7" })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx(ExecutionLogList, { accountId: selectedAccountId }) })] })] })] }));
}
