import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Activity, Users, FileText, Play } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { AccountCard } from '@/components/dashboard/AccountCard';
import { ExecutionLogList } from '@/components/dashboard/ExecutionLogList';
import { WorkflowMonitor } from '@/components/dashboard/WorkflowMonitor';

export const Route = createFileRoute('/dashboard' as any)({
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

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* 顶部概览 */}
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    军机处 - 监控中心
                </h1>
                <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>在线账号: {accounts.filter(a => a.status === 'online' || a.status === 'busy').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        <span>运行中工作流: {accounts.filter(a => a.currentWorkflowId).length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：账号列表 */}
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

                {/* 中间：工作流监控 */}
                <div className="flex-1 bg-gray-50 relative">
                    {selectedAccountId ? (
                        <WorkflowMonitor accountId={selectedAccountId} />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>选择左侧账号以查看实时工作流</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧：执行日志 */}
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
