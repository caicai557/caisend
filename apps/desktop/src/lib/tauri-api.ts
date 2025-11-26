import { invoke } from '@tauri-apps/api/tauri';
import type { CompiledWorkflow } from './workflow-compiler';

export interface ValidationReport {
    errors: string[];
    warnings: string[];
}

/**
 * Tauri IPC 封装
 */
export const workflowApi = {
    /**
     * 验证工作流
     */
    async validate(workflow: CompiledWorkflow): Promise<ValidationReport> {
        return await invoke<ValidationReport>('validate_workflow', { definition: workflow });
    },

    /**
     * 保存工作流
     */
    async save(workflow: CompiledWorkflow): Promise<void> {
        return await invoke('save_workflow', { workflow });
    },

    /**
     * 加载所有工作流
     */
    async loadAll(): Promise<CompiledWorkflow[]> {
        return await invoke<CompiledWorkflow[]>('load_workflows');
    },

    /**
     * 删除工作流
     */
    async delete(workflowId: string): Promise<void> {
        return await invoke('delete_workflow', { workflowId });
    },

    /**
     * 激活/停用工作流
     */
    async toggleActive(workflowId: string, isActive: boolean): Promise<void> {
        return await invoke('toggle_workflow_active', { workflowId, isActive });
    },
};
