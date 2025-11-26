import { useDashboardStore } from '@/stores/dashboardStore';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ExecutionLogListProps {
    accountId: string | null;
}

export function ExecutionLogList({ accountId }: ExecutionLogListProps) {
    const logs = useDashboardStore(state =>
        accountId
            ? state.logs.filter(l => l.accountId === accountId)
            : state.logs
    );

    if (logs.length === 0) {
        return (
            <div className="p-8 text-center text-gray-400 text-sm">
                暂无执行日志
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {logs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                            {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {log.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                            {log.status === 'running' && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium truncate">{log.message}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span>•</span>
                                <span className="font-mono">{log.nodeId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
