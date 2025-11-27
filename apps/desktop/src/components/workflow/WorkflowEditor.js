import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import ReactFlow, { MiniMap, Controls, Background, BackgroundVariant, } from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/stores/workflowStore';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { NodePalette } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
const nodeTypes = {
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
    branch: ConditionNode, // 分支节点使用条件节点样式
};
export function WorkflowEditor() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectNode, } = useWorkflowStore();
    const handleNodeClick = useCallback((_event, node) => {
        selectNode(node);
    }, [selectNode]);
    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);
    return (_jsxs("div", { className: "flex h-screen", children: [_jsx(NodePalette, {}), _jsx("div", { className: "flex-1 relative", children: _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onNodeClick: handleNodeClick, onPaneClick: handlePaneClick, nodeTypes: nodeTypes, fitView: true, children: [_jsx(Background, { variant: BackgroundVariant.Dots, gap: 12, size: 1 }), _jsx(Controls, {}), _jsx(MiniMap, {})] }) }), _jsx(NodeConfigPanel, {})] }));
}
