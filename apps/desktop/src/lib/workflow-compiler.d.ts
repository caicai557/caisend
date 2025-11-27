import { WorkflowNode as ReactFlowNode, WorkflowEdge as ReactFlowEdge } from '@/stores/workflowStore';
/**
 * 后端 JSON DSL 格式
 */
export interface CompiledWorkflow {
    id: string;
    name: string;
    description: string;
    nodes: BackendNode[];
    edges: BackendEdge[];
}
export interface BackendNode {
    id: string;
    node_type: 'trigger' | 'condition' | 'action';
    config: Record<string, any>;
}
export interface BackendEdge {
    source_node_id: string;
    target_node_id: string;
    condition?: {
        match_type: 'exact' | 'regex' | 'semantic' | 'fallback' | 'timeout';
        pattern?: string;
        value?: string;
    };
}
/**
 * 将前端 React Flow 格式编译为后端 JSON DSL
 */
export declare function compileWorkflow(nodes: ReactFlowNode[], edges: ReactFlowEdge[], metadata: {
    name: string;
    description: string;
}): CompiledWorkflow;
/**
 * 将后端格式反向解析为前端格式
 */
export declare function decompileWorkflow(compiled: CompiledWorkflow): {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
};
//# sourceMappingURL=workflow-compiler.d.ts.map