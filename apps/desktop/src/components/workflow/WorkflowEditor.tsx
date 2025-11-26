import { useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '@/stores/workflowStore';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';

const nodeTypes: NodeTypes = {
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
    branch: ConditionNode, // 分支节点使用条件节点样式
};

export function WorkflowEditor() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectNode,
    } = useWorkflowStore();

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: any) => {
            selectNode(node);
        },
        [selectNode]
    );

    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    return (
        <div className="flex h-screen">
            {/* 左侧：节点工具箱 */}
            <NodePalette />

            {/* 中间：React Flow 画布 */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>

            {/* 右侧：节点配置面板 */}
            <NodeConfigPanel />
        </div>
    );
}
