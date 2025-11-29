import { useEffect } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Activity, Users, AlertTriangle, Shield } from 'lucide-react';

export function GlobalMonitor() {
    const { systemStatus, fetchSystemStatus } = useDashboardStore();

    useEffect(() => {
        fetchSystemStatus();
        const interval = setInterval(fetchSystemStatus, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [fetchSystemStatus]);

    if (!systemStatus) {
        return <div className="p-4 text-gray-500">正在加载系统状态...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">总账户数</p>
                        <p className="text-2xl font-bold">{systemStatus.total_accounts}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-full">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">在线账户</p>
                        <p className="text-2xl font-bold text-green-600">{systemStatus.online_count}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-full">
                        <Activity className="w-6 h-6 text-green-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">受限/封禁</p>
                        <p className="text-2xl font-bold text-red-600">
                            {(systemStatus.lifecycle_distribution['Restricted'] || 0) + (systemStatus.lifecycle_distribution['Banned'] || 0)}
                        </p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">活跃会话</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {systemStatus.lifecycle_distribution['Active'] || 0}
                        </p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-full">
                        <Shield className="w-6 h-6 text-purple-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
