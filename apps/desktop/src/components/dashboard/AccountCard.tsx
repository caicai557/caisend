import { User, Circle, Clock } from 'lucide-react';
import type { AccountState } from '@/stores/dashboardStore';

interface AccountCardProps {
    account: AccountState;
    isSelected: boolean;
    onClick: () => void;
}

export function AccountCard({ account, isSelected, onClick }: AccountCardProps) {
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

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-gray-100">
                        <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="font-medium text-gray-800">{account.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className="text-xs text-gray-500">{statusText}</span>
                </div>
            </div>

            <div className="space-y-1">
                {account.currentWorkflowId && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        <Circle className="w-3 h-3 animate-pulse" />
                        <span>执行中: {account.currentWorkflowId}</span>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(account.lastActive).toLocaleTimeString()}</span>
                    </div>
                    <span>{account.messageCount} 消息</span>
                </div>
            </div>
        </div>
    );
}
