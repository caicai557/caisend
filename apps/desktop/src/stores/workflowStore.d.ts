import { Node, Edge, Connection } from 'reactflow';
import type { NodeChange, EdgeChange } from 'reactflow';
export interface WorkflowNode extends Node {
    type: 'trigger' | 'condition' | 'action' | 'branch';
    data: {
        label: string;
        config?: any;
        isActive?: boolean;
    };
}
export type WorkflowEdge = Edge<{
    label?: string;
    condition?: any;
}>;
interface WorkflowState {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    selectedNode: WorkflowNode | null;
    setNodes: (nodes: WorkflowNode[]) => void;
    setEdges: (edges: WorkflowEdge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    addNode: (node: WorkflowNode) => void;
    updateNodeData: (nodeId: string, data: any) => void;
    selectNode: (node: WorkflowNode | null) => void;
    clearWorkflow: () => void;
}
export declare const useWorkflowStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WorkflowState>>;
export {};
//# sourceMappingURL=workflowStore.d.ts.map