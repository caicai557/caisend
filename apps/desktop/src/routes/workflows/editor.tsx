import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ipcSaveWorkflowDefinition } from '@/lib/ipc'
import { WorkflowDefinition } from '@/lib/schemas'
import { v4 as uuidv4 } from 'uuid'

export const Route = createFileRoute('/workflows/editor')({
    component: WorkflowEditor,
})

const initialNodes: Node[] = [
    {
        id: 'start',
        type: 'input', // ReactFlow default type, we map to our 'Start'
        data: { label: 'Start' },
        position: { x: 250, y: 5 },
    },
]

function WorkflowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [workflowName, setWorkflowName] = useState("New Workflow")
    const [isSaving, setIsSaving] = useState(false)

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    )

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()

            const type = event.dataTransfer.getData('application/reactflow')

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return
            }

            const position = {
                x: event.clientX - 200, // approximate offset
                y: event.clientY - 100,
            }

            const newNode: Node = {
                id: uuidv4(),
                type: 'default', // We use default for now and store type in data
                position,
                data: { label: `${type} Node`, nodeType: type },
            }

            setNodes((nds) => nds.concat(newNode))
        },
        [setNodes],
    )

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Convert ReactFlow nodes/edges to our Schema
            // This is a simplified mapping. In a real app, we'd have custom node types.
            const definition: WorkflowDefinition = {
                id: uuidv4(), // Or existing ID
                name: workflowName,
                version: "1.0.0",
                nodes: nodes.reduce((acc, node) => {
                    acc[node.id] = {
                        id: node.id,
                        type: (node.data.nodeType as any) || "Start", // Default fallback
                        position: node.position,
                        config: {
                            type: (node.data.nodeType as any) || "Start",
                            data: {}
                        }
                    }
                    return acc
                }, {} as Record<string, any>),
                edges: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    condition: null
                })),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            await ipcSaveWorkflowDefinition(definition)
            alert("Workflow saved!")
        } catch (e) {
            console.error(e)
            alert("Failed to save workflow")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="h-screen flex flex-col">
            <div className="h-14 border-b flex items-center px-4 justify-between bg-background">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold">Workflow Editor</h1>
                    <input
                        value={workflowName}
                        onChange={e => setWorkflowName(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-primary/90"
                    >
                        {isSaving ? 'Saving...' : 'Save Workflow'}
                    </button>
                </div>
            </div>
            <div className="flex-1 flex">
                <Sidebar />
                <div className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>
            </div>
        </div>
    )
}

function Sidebar() {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType)
        event.dataTransfer.effectAllowed = 'move'
    }

    return (
        <aside className="w-64 border-r bg-muted/10 p-4 flex flex-col gap-2">
            <div className="font-semibold mb-2">Nodes</div>
            <div className="p-2 border rounded bg-background cursor-move hover:border-primary" onDragStart={(event) => onDragStart(event, 'SendMessage')} draggable>
                Send Message
            </div>
            <div className="p-2 border rounded bg-background cursor-move hover:border-primary" onDragStart={(event) => onDragStart(event, 'WaitForResponse')} draggable>
                Wait For Response
            </div>
            <div className="p-2 border rounded bg-background cursor-move hover:border-primary" onDragStart={(event) => onDragStart(event, 'ConditionalBranch')} draggable>
                Conditional Branch
            </div>
            <div className="p-2 border rounded bg-background cursor-move hover:border-primary" onDragStart={(event) => onDragStart(event, 'AddTag')} draggable>
                Add Tag
            </div>
            <div className="p-2 border rounded bg-background cursor-move hover:border-primary" onDragStart={(event) => onDragStart(event, 'End')} draggable>
                End
            </div>
        </aside>
    )
}
