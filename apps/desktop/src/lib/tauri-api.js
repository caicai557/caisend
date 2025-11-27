import { invoke } from '@tauri-apps/api/tauri';
/**
 * Tauri IPC 封装
 */
export const workflowApi = {
    /**
     * 验证工作流
     */
    async validate(workflow) {
        return await invoke('validate_workflow', { definition: workflow });
    },
    /**
     * 保存工作流
     */
    async save(workflow) {
        return await invoke('save_workflow', { workflow });
    },
    /**
     * 加载所有工作流
     */
    async loadAll() {
        return await invoke('load_workflows');
    },
    /**
     * 删除工作流
     */
    async delete(workflowId) {
        return await invoke('delete_workflow', { workflowId });
    },
    /**
     * 激活/停用工作流
     */
    async toggleActive(workflowId, isActive) {
        return await invoke('toggle_workflow_active', { workflowId, isActive });
    },
};
