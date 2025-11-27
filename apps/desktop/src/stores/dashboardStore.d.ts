export interface AccountState {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'busy' | 'error';
    currentWorkflowId?: string | null;
    currentNodeId?: string | null;
    lastActive: string;
    messageCount: number;
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
    accounts: AccountState[];
    logs: ExecutionLog[];
    selectedAccountId: string | null;
    setAccounts: (accounts: AccountState[]) => void;
    updateAccount: (id: string, update: Partial<AccountState>) => void;
    addLog: (log: ExecutionLog) => void;
    selectAccount: (id: string | null) => void;
    fetchInitialData: () => Promise<void>;
    subscribeToEvents: () => Promise<() => void>;
}
export declare const useDashboardStore: import("zustand").UseBoundStore<import("zustand").StoreApi<DashboardState>>;
export {};
//# sourceMappingURL=dashboardStore.d.ts.map