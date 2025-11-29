import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface AccountStats {
    message_count: number;
    daily_traffic: number;
    uptime_minutes: number;
}

export interface AccountState {
    id: string;
    name: string;
    status: string; // 'Active' | 'Login' | 'Restricted' | 'Banned'
    stats: AccountStats;
    lastActive: string;
}

export interface SystemStatus {
    total_accounts: number;
    online_count: number;
    lifecycle_distribution: Record<string, number>;
    accounts: any[]; // Raw snapshots from backend
}

export interface ExecutionLog {
    id: string;
    accountId: string;
    workflowId: string;
    nodeId: string;
    status: 'success' | 'failed' | 'running';
    message: string;
    timestamp: string;
}

interface DashboardState {
    systemStatus: SystemStatus | null;
    accounts: AccountState[];
    logs: ExecutionLog[];
    selectedAccountId: string | null;

    setAccounts: (accounts: AccountState[]) => void;
    updateAccount: (id: string, update: Partial<AccountState>) => void;
    addLog: (log: ExecutionLog) => void;
    selectAccount: (id: string | null) => void;

    // Async actions
    fetchSystemStatus: () => Promise<void>;
    subscribeToEvents: () => Promise<() => void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    systemStatus: null,
    accounts: [],
    logs: [],
    selectedAccountId: null,

    setAccounts: (accounts) => set({ accounts }),

    updateAccount: (id, update) => set((state) => ({
        accounts: state.accounts.map(acc =>
            acc.id === id ? { ...acc, ...update } : acc
        )
    })),

    addLog: (log) => set((state) => ({
        logs: [log, ...state.logs].slice(0, 100)
    })),

    selectAccount: (id) => set({ selectedAccountId: id }),

    fetchSystemStatus: async () => {
        try {
            const status = await invoke<SystemStatus>('get_system_status');

            const accounts: AccountState[] = (status.accounts || []).map((snap: any) => ({
                id: snap.id,
                name: `Account ${snap.id.slice(0, 6)}`,
                status: snap.status,
                stats: snap.stats,
                lastActive: snap.last_heartbeat,
            }));

            set({
                systemStatus: status,
                accounts: accounts
            });
        } catch (error) {
            console.error('Failed to fetch system status:', error);
        }
    },

    subscribeToEvents: async () => {
        const unlisteners: (() => void)[] = [];

        // Subscribe to real-time system status updates
        const statusUnlisten = await listen<any>('system_status_update', (event) => {
            const status = event.payload;

            const accounts: AccountState[] = (status.accounts || []).map((snap: any) => ({
                id: snap.id,
                name: `Account ${snap.id.slice(0, 6)}`,
                status: snap.status,
                stats: snap.stats,
                lastActive: snap.last_heartbeat,
            }));

            set({
                systemStatus: status,
                accounts: accounts
            });

            console.log('[Dashboard] Received real-time status update:', status);
        });

        unlisteners.push(statusUnlisten);

        // Subscribe to workflow updates
        const workflowUnlisten = await listen<any>('workflow_update', (event) => {
            const { type, data } = event.payload;

            if (type === 'node_execution') {
                get().updateAccount(data.contactId, {
                    lastActive: new Date().toISOString(),
                    status: 'busy'
                });

                get().addLog({
                    id: crypto.randomUUID(),
                    accountId: data.contactId,
                    workflowId: data.workflowId,
                    nodeId: data.nodeId,
                    status: data.status || 'running',
                    message: `执行节点: ${data.nodeId}`,
                    timestamp: new Date().toISOString()
                });
            } else if (type === 'workflow_complete') {
                get().addLog({
                    id: crypto.randomUUID(),
                    accountId: data.contactId,
                    workflowId: data.workflowId,
                    nodeId: 'end',
                    status: 'success',
                    message: '工作流执行完成',
                    timestamp: new Date().toISOString()
                });
            }
        });

        unlisteners.push(workflowUnlisten);

        return () => {
            unlisteners.forEach(unlisten => unlisten());
        };
    },
}));
