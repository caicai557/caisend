// PBT Node Types
export type PBTNodeType =
    | 'sequence'      // 顺序执行节点
    | 'selector'      // 选择执行节点  
    | 'parallel'      // 并行执行节点
    | 'condition'     // 条件判断节点
    | 'action'        // 行为执行节点
    | 'decorator';    // 装饰器节点

// Node visual themes
export const NODE_THEMES = {
    sequence: {
        bg: 'from-blue-500/20 to-blue-600/20',
        border: 'border-blue-500',
        icon: '→',
        label: '顺序',
    },
    selector: {
        bg: 'from-purple-500/20 to-purple-600/20',
        border: 'border-purple-500',
        icon: '?',
        label: '选择',
    },
    parallel: {
        bg: 'from-green-500/20 to-green-600/20',
        border: 'border-green-500',
        icon: '‖',
        label: '并行',
    },
    condition: {
        bg: 'from-yellow-500/20 to-yellow-600/20',
        border: 'border-yellow-500',
        icon: '✓',
        label: '条件',
    },
    action: {
        bg: 'from-red-500/20 to-red-600/20',
        border: 'border-red-500',
        icon: '⚡',
        label: '行为',
    },
    decorator: {
        bg: 'from-indigo-500/20 to-indigo-600/20',
        border: 'border-indigo-500',
        icon: '◇',
        label: '装饰',
    },
} as const;

// PBT Node Data Structure
export interface PBTNodeData {
    label: string;
    type: PBTNodeType;
    description?: string;
    config?: Record<string, any>;
    // For action nodes
    actionType?: string;
    actionParams?: Record<string, any>;
    // For condition nodes
    expression?: string;
    // For decorator nodes
    decoratorType?: string;
    decoratorParams?: Record<string, any>;
}

// React Flow Node with PBT data
export interface PBTFlowNode {
    id: string;
    type: string; // Will be 'pbt-node'
    data: PBTNodeData;
    position: { x: number; y: number };
}

// Backend PBT Definition (matching Rust structure)
export interface PBTDefinition {
    id: string;
    name: string;
    description?: string;
    root_node: PBTBackendNode;
    created_at?: string;
    updated_at?: string;
}

export interface PBTBackendNode {
    node_type: PBTNodeType;
    label: string;
    children?: PBTBackendNode[];
    config?: Record<string, any>;
}

// Workflow validation errors
export interface ValidationError {
    nodeId: string;
    message: string;
    severity: 'error' | 'warning';
}
