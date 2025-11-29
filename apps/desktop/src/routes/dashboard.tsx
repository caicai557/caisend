import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Activity, FileText } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { ExecutionLogList } from '@/components/dashboard/ExecutionLogList';
import { WorkflowMonitor } from '@/components/dashboard/WorkflowMonitor';
import { GlobalMonitor } from '@/components/dashboard/GlobalMonitor';

export const Route = createFileRoute('/dashboard' as any)({
    component: DashboardPage,
});

function DashboardPage() {
    const { accounts, selectedAccountId, selectAccount, fetchSystemStatus, subscribeToEvents } = useDashboardStore();

    useEffect(() => {
        fetchSystemStatus();
        const unsubscribePromise = subscribeToEvents();

        return () => {
            unsubscribePromise.then(unlisten => unlisten());
        };
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    军机处 - 监控中心
                </h1>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Account List */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-700">账号状态</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {accounts.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                isSelected={selectedAccountId === account.id}
                                onClick={() => selectAccount(account.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Center: Monitor or Workflow */}
                <div className="flex-1 bg-gray-50 relative flex flex-col">
                    {!selectedAccountId ? (
                        <div className="p-6 overflow-y-auto">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">全网概览</h2>
                            <GlobalMonitor />

                            <div className="mt-12 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>选择左侧账号以查看详细工作流</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <WorkflowMonitor accountId={selectedAccountId} />
                    )}
                </div>

                {/* Right: Logs */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <h2 className="font-semibold text-gray-700">执行日志</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ExecutionLogList accountId={selectedAccountId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
