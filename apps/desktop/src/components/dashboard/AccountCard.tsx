import { User, Clock, Activity } from 'lucide-react';
import type { AccountState } from '@/stores/dashboardStore';

interface AccountCardProps {
    account: AccountState;
    isSelected: boolean;
    onClick: () => void;
}

export function AccountCard({ account, isSelected, onClick }: AccountCardProps) {
    const statusColor = {
        'Active': 'bg-green-500',
        'Login': 'bg-blue-500',
        'Restricted': 'bg-yellow-500',
        'Banned': 'bg-red-500',
    }[account.status] || 'bg-gray-400';

    const statusText = {
        'Active': '活跃',
        'Login': '登录中',
        'Restricted': '受限',
        'Banned': '封禁',
    }[account.status] || account.status;

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
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(account.lastActive).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{account.stats.message_count} 消息</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
