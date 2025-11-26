import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type { NodeChange, EdgeChange } from 'reactflow';

export interface WorkflowNode extends Node {
    type: 'trigger' | 'condition' | 'action' | 'branch';
    data: {
        label: string;
        config?: any;
        isActive?: boolean; // 用于仪表盘高亮
    };
}

export interface WorkflowEdge extends Edge {
    data?: {
        label?: string;
    };
}

interface WorkflowState {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    selectedNode: WorkflowNode | null;

    // Actions
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

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges) as WorkflowEdge[],
        });
    },

    onConnect: (connection) => {
        set({
            edges: addEdge(connection, get().edges) as WorkflowEdge[],
        });
    },

    addNode: (node) => {
        set({
            nodes: [...get().nodes, node],
        });
    },

    updateNodeData: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
        });
    },

    selectNode: (node) => set({ selectedNode: node }),

    clearWorkflow: () => set({ nodes: [], edges: [], selectedNode: null }),
}));
