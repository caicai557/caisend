import { useCallback, useRef, useState, DragEvent } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type Edge,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes/PBTNode';
event.preventDefault();
event.dataTransfer.dropEffect = 'move';
    }, []);

const onDrop = useCallback(
    (event: DragEvent) => {
        event.preventDefault();

        const nodeType = event.dataTransfer.getData('application/reactflow') as PBTNodeType;
        if (!nodeType) return;

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const newNode: Node<PBTNodeData> = {
            id: `${nodeType}-${Date.now()}`,
            type: 'pbt-node',
            position,
            data: {
                label: `New ${nodeType} Node`,
                type: nodeType,
                description: '',
            },
        };

        onNodesChange([{ type: 'add', item: newNode }]);
    },
    [screenToFlowPosition, onNodesChange]
);

return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
        >
            <Background gap={16} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap
                nodeColor={(node) => {
                    const data = node.data as PBTNodeData;
                    const colors = {
                        sequence: '#3b82f6',
                        selector: '#a855f7',
                        parallel: '#22c55e',
                        condition: '#eab308',
                        action: '#ef4444',
                        decorator: '#6366f1',
                    };
                    return colors[data.type] || '#9ca3af';
                    export function PBTEditor() {
                        const [nodes, setNodes] = useState<Node<PBTNodeData>[]>([]);
                        const [edges, setEdges] = useState<Edge[]>([]);
                        const [selectedNode, setSelectedNode] = useState<Node<PBTNodeData> | null>(null);

                        const onNodesChange = useCallback<OnNodesChange>(
                            (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
                            []
                        );

                        const onEdgesChange = useCallback<OnEdgesChange>(
                            (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
                            []
                        );

                        const onConnect = useCallback<OnConnect>(
                            (connection) => setEdges((eds) => addEdge(connection, eds)),
                            []
                        );

                        const onNodeClick = useCallback(
                            (_event: React.MouseEvent, node: Node<PBTNodeData>) => {
                                ```typescript
import { useCallback, useRef, useState, DragEvent } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type Edge,
    type OnConnect,
    type OnNodesChange,
    type OnEdgesChange,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes/PBTNode';
import { PBTNodePalette } from './PBTNodePalette';
import { PropertyPanel } from './PropertyPanel';
import type { PBTNodeData, PBTNodeType } from '@/types/pbt';
import { Save, Download, Trash2 } from 'lucide-react';

interface PBTEditorCoreProps {
    nodes: Node<PBTNodeData>[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onNodeClick?: (event: React.MouseEvent, node: Node<PBTNodeData>) => void;
    onSave: () => void;
    onExport: () => void;
}

function PBTEditorCore({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onSave,
    onExport,
}: PBTEditorCoreProps) {
    const { screenToFlowPosition } = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const nodeType = event.dataTransfer.getData('application/reactflow') as PBTNodeType;
            if (!nodeType) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node<PBTNodeData> = {
                id: `${ nodeType } -${ Date.now() } `,
                type: 'pbt-node',
                position,
                data: {
                    label: `New ${ nodeType } Node`,
                    type: nodeType,
                    description: '',
                },
            };

            onNodesChange([{ type: 'add', item: newNode }]);
        },
        [screenToFlowPosition, onNodesChange]
    );

    return (
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
            >
                <Background gap={16} size={1} color="#e5e7eb" />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const data = node.data as PBTNodeData;
                        const colors = {
                            sequence: '#3b82f6',
                            selector: '#a855f7',
                            parallel: '#22c55e',
                            condition: '#eab308',
                            action: '#ef4444',
                            decorator: '#6366f1',
                        };
                        return colors[data.type] || '#9ca3af';
                    }}
                    pannable
                    zoomable
                />

                <Panel position="top-right" className="flex gap-2">
                    <button
                        className="px-3 py-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                        onClick={onSave}
                    >
                        <Save className="w-4 h-4" />
                        <span className="text-sm font-medium">Save</span>
                    </button>
                    <button
                        className="px-3 py-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                        onClick={onExport}
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Export</span>
                    </button>
                    <button
                        className="px-3 py-2 bg-white rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2 shadow-sm"
                        onClick={() => {
                            onNodesChange(nodes.map(n => ({ type: 'remove', id: n.id })));
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Clear</span>
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
}

export function PBTEditor() {
    const [nodes, setNodes] = useState<Node<PBTNodeData>[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNode, setSelectedNode] = useState<Node<PBTNodeData> | null>(null);

    const onNodesChange = useCallback<OnNodesChange>(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback<OnEdgesChange>(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect = useCallback<OnConnect>(
        (connection) => setEdges((eds) => addEdge(connection, eds)),
        []
    );

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node<PBTNodeData>) => {
            setSelectedNode(node);
        },
        []
    );

    const updateNode = useCallback((id: string, data: Partial<PBTNodeData>) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id ? { ...node, data: { ...node.data, ...data } } : node
            )
        );
    }, []);

    const handleSave = useCallback(async () => {
        try {
            const { convertToPBTDefinition } = await import('@/utils/pbtConverter');
            const definition = convertToPBTDefinition(nodes, edges, 'My Workflow', 'Created from editor');

            if (!definition) {
                alert('无法保存：请至少添加一个节点');
                return;
            }

            // TODO: Call Tauri command to save
            console.log('Saving workflow:', definition);
            alert('工作流已保存！');
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败');
        }
    }, [nodes, edges]);

    const handleExport = useCallback(() => {
        try {
            const dataStr = JSON.stringify({ nodes, edges }, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'workflow.json';
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败');
        }
    }, [nodes, edges]);

    return (
        <div className="h-screen flex">
            <PBTNodePalette />
            <ReactFlowProvider>
                <PBTEditorCore
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onSave={handleSave}
                    onExport={handleExport}
                />
            </ReactFlowProvider>
            <PropertyPanel
                selectedNode={selectedNode}
                onUpdateNode={updateNode}
                onClose={() => setSelectedNode(null)}
            />
        </div>
    );
}
```
