import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { useDashboardStore } from '@/stores/dashboardStore';
import { TriggerNode } from '../workflow/nodes/TriggerNode';
import { ConditionNode } from '../workflow/nodes/ConditionNode';
import { ActionNode } from '../workflow/nodes/ActionNode';
// 复用节点类型
const nodeTypes = {
    trigger: TriggerNode,
    condition: ConditionNode,
    action: ActionNode,
    branch: ConditionNode,
};
export function WorkflowMonitor({ accountId }) {
    const account = useDashboardStore(state => state.accounts.find(a => a.id === accountId));
    // 模拟：根据 account.currentWorkflowId 加载工作流定义
    // 实际应用中应该从后端 API 获取
    const initialNodes = useMemo(() => [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: '收到消息' } },
        { id: 'node_2', type: 'condition', position: { x: 250, y: 100 }, data: { label: '意图识别' } },
        { id: 'node_3', type: 'action', position: { x: 100, y: 200 }, data: { label: '回复欢迎语' } },
        { id: 'node_4', type: 'action', position: { x: 400, y: 200 }, data: { label: '转人工' } },
    ], []);
    const initialEdges = useMemo(() => [
        { id: 'e1-2', source: 'node_1', target: 'node_2' },
        { id: 'e2-3', source: 'node_2', target: 'node_3' },
        { id: 'e2-4', source: 'node_2', target: 'node_4' },
    ], []);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    // 监听账号状态变化，高亮当前节点
    useEffect(() => {
        if (account?.currentNodeId) {
            setNodes(nds => nds.map(node => ({
                ...node,
                data: {
                    ...node.data,
                    isActive: node.id === account.currentNodeId
                },
                // 高亮样式
                style: node.id === account.currentNodeId
                    ? { filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' }
                    : {}
            })));
        }
    }, [account?.currentNodeId, setNodes]);
    if (!account)
        return null;
    return (_jsxs("div", { className: "h-full w-full relative", children: [_jsxs("div", { className: "absolute top-4 left-4 z-10 bg-white/80 backdrop-blur p-2 rounded-lg border border-gray-200 shadow-sm", children: [_jsx("h3", { className: "text-sm font-bold text-gray-800", children: account.currentWorkflowId ? `正在执行: ${account.currentWorkflowId}` : '空闲' }), account.currentNodeId && (_jsxs("p", { className: "text-xs text-blue-600 animate-pulse", children: ["\u5F53\u524D\u8282\u70B9: ", account.currentNodeId] }))] }), _jsxs(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, nodeTypes: nodeTypes, fitView: true, nodesDraggable: false, nodesConnectable: false, elementsSelectable: true, children: [_jsx(Background, { color: "#e5e7eb", gap: 16 }), _jsx(Controls, { showInteractive: false })] })] }));
}
