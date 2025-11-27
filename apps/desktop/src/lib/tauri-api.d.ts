import type { CompiledWorkflow } from './workflow-compiler';
export interface ValidationReport {
    errors: string[];
    warnings: string[];
}
/**
 * Tauri IPC 封装
 */
export declare const workflowApi: {
    /**
     * 验证工作流
     */
    validate(workflow: CompiledWorkflow): Promise<ValidationReport>;
    /**
     * 保存工作流
     */
    save(workflow: CompiledWorkflow): Promise<void>;
    /**
     * 加载所有工作流
     */
    loadAll(): Promise<CompiledWorkflow[]>;
    /**
     * 删除工作流
     */
    delete(workflowId: string): Promise<void>;
    /**
     * 激活/停用工作流
     */
    toggleActive(workflowId: string, isActive: boolean): Promise<void>;
};
//# sourceMappingURL=tauri-api.d.ts.map