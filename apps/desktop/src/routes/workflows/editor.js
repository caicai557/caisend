import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, addEdge, } from 'reactflow';
import 'reactflow/dist/style.css';
import { ipcSaveWorkflowDefinition } from '@/lib/ipc';
import { v4 as uuidv4 } from 'uuid';
export const Route = createFileRoute('/workflows/editor')({
    component: WorkflowEditor,
});
const initialNodes = [
    {
        id: 'start',
        type: 'input', // ReactFlow default type, we map to our 'Start'
        data: { label: 'Start' },
        position: { x: 250, y: 5 },
    },
];
function WorkflowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [workflowName, setWorkflowName] = useState("New Workflow");
    const [isSaving, setIsSaving] = useState(false);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);
    const onDrop = useCallback((event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
            return;
        }
        const position = {
            x: event.clientX - 200, // approximate offset
            y: event.clientY - 100,
        };
        const newNode = {
            id: uuidv4(),
            type: 'default', // We use default for now and store type in data
            position,
            data: { label: `${type} Node`, nodeType: type },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes]);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Convert ReactFlow nodes/edges to our Schema
            // This is a simplified mapping. In a real app, we'd have custom node types.
            const definition = {
                id: uuidv4(), // Or existing ID
                name: workflowName,
                version: "1.0.0",
                nodes: nodes.reduce((acc, node) => {
                    acc[node.id] = {
                        id: node.id,
                        type: node.data.nodeType || "Start", // Default fallback
                        position: node.position,
                        config: {
                            type: node.data.nodeType || "Start",
                            data: {}
                        }
                    };
                    return acc;
                }, {}),
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    condition: null
                })),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await ipcSaveWorkflowDefinition(definition);
            alert("Workflow saved!");
        }
        catch (e) {
            console.error(e);
            alert("Failed to save workflow");
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsxs("div", { className: "h-screen flex flex-col", children: [_jsxs("div", { className: "h-14 border-b flex items-center px-4 justify-between bg-background", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("h1", { className: "font-bold", children: "Workflow Editor" }), _jsx("input", { value: workflowName, onChange: e => setWorkflowName(e.target.value), className: "border rounded px-2 py-1 text-sm" })] }), _jsx("div", { className: "flex gap-2", children: _jsx("button", { onClick: handleSave, disabled: isSaving, className: "bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-primary/90", children: isSaving ? 'Saving...' : 'Save Workflow' }) })] }), _jsxs("div", { className: "flex-1 flex", children: [_jsx(Sidebar, {}), _jsx("div", { className: "flex-1 h-full", onDragOver: onDragOver, onDrop: onDrop, children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, fitView: true, children: [_jsx(Background, {}), _jsx(Controls, {})] }) })] })] }));
}
function Sidebar() {
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };
    return (_jsxs("aside", { className: "w-64 border-r bg-muted/10 p-4 flex flex-col gap-2", children: [_jsx("div", { className: "font-semibold mb-2", children: "Nodes" }), _jsx("div", { className: "p-2 border rounded bg-background cursor-move hover:border-primary", onDragStart: (event) => onDragStart(event, 'SendMessage'), draggable: true, children: "Send Message" }), _jsx("div", { className: "p-2 border rounded bg-background cursor-move hover:border-primary", onDragStart: (event) => onDragStart(event, 'WaitForResponse'), draggable: true, children: "Wait For Response" }), _jsx("div", { className: "p-2 border rounded bg-background cursor-move hover:border-primary", onDragStart: (event) => onDragStart(event, 'ConditionalBranch'), draggable: true, children: "Conditional Branch" }), _jsx("div", { className: "p-2 border rounded bg-background cursor-move hover:border-primary", onDragStart: (event) => onDragStart(event, 'AddTag'), draggable: true, children: "Add Tag" }), _jsx("div", { className: "p-2 border rounded bg-background cursor-move hover:border-primary", onDragStart: (event) => onDragStart(event, 'End'), draggable: true, children: "End" })] }));
}
