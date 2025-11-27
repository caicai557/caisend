import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
export const useDashboardStore = create((set, get) => ({
    accounts: [],
    logs: [],
    selectedAccountId: null,
    setAccounts: (accounts) => set({ accounts }),
    updateAccount: (id, update) => set((state) => ({
        accounts: state.accounts.map(acc => acc.id === id ? { ...acc, ...update } : acc)
    })),
    addLog: (log) => set((state) => ({
        logs: [log, ...state.logs].slice(0, 100)
    })),
    selectAccount: (id) => set({ selectedAccountId: id }),
    fetchInitialData: async () => {
        try {
            // 获取活跃工作流实例
            const instances = await invoke('list_active_instances');
            // 将实例映射为账号状态
            const accounts = instances.map(inst => ({
                id: inst.contact_id,
                name: `Contact ${inst.contact_id.slice(0, 6)}`,
                status: 'busy',
                currentWorkflowId: inst.definition_id,
                currentNodeId: inst.current_node_id,
                lastActive: inst.updated_at,
                messageCount: 0,
            }));
            if (accounts.length === 0) {
                // 如果没有活跃实例，添加一个空闲的示例账号用于展示
                accounts.push({
                    id: 'demo_account',
                    name: '演示账号',
                    status: 'online',
                    lastActive: new Date().toISOString(),
                    messageCount: 0,
                });
            }
            set({ accounts });
        }
        catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    },
    subscribeToEvents: async () => {
        const unlisten = await listen('workflow_update', (event) => {
            const { type, data } = event.payload;
            if (type === 'node_execution') {
                get().updateAccount(data.contactId, {
                    currentNodeId: data.nodeId,
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
            }
            else if (type === 'workflow_complete') {
                get().updateAccount(data.contactId, {
                    currentWorkflowId: null,
                    currentNodeId: null,
                    status: 'online'
                });
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
        return unlisten;
    },
}));
