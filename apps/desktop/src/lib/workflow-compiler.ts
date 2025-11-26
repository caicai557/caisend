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
export function compileWorkflow(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    metadata: { name: string; description: string }
): CompiledWorkflow {
    // 转换节点
    const backendNodes: BackendNode[] = nodes.map((node) => ({
        id: node.id,
        node_type: node.type === 'branch' ? 'condition' : node.type,
        config: node.data.config || {},
    }));

    // 转换边
    const backendEdges: BackendEdge[] = edges.map((edge) => ({
        source_node_id: edge.source,
        target_node_id: edge.target,
        condition: edge.data?.condition,
    }));

    return {
        id: crypto.randomUUID(),
        name: metadata.name,
        description: metadata.description,
        nodes: backendNodes,
        edges: backendEdges,
    };
}

/**
 * 将后端格式反向解析为前端格式
 */
export function decompileWorkflow(compiled: CompiledWorkflow): {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
} {
    const nodes: ReactFlowNode[] = compiled.nodes.map((node, index) => ({
        id: node.id,
        type: node.node_type,
        position: { x: 100 + index * 250, y: 100 },
        data: {
            label: node.config.label || `${node.node_type} ${index + 1}`,
            config: node.config,
        },
    }));

    const edges: ReactFlowEdge[] = compiled.edges.map((edge, index) => ({
        id: `e${index}`,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: 'default',
        data: {
            condition: edge.condition,
        },
    }));

    return { nodes, edges };
}
