import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
export const useWorkflowStore = create((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    addNode: (node) => {
        set({
            nodes: [...get().nodes, node],
        });
    },
    updateNodeData: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) => node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node),
        });
    },
    selectNode: (node) => set({ selectedNode: node }),
    clearWorkflow: () => set({ nodes: [], edges: [], selectedNode: null }),
}));
