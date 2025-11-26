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

interface WorkflowMonitorProps {
    accountId: string;
}

export function WorkflowMonitor({ accountId }: WorkflowMonitorProps) {
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

    if (!account) return null;

    return (
        <div className="h-full w-full relative">
            <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur p-2 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800">
                    {account.currentWorkflowId ? `正在执行: ${account.currentWorkflowId}` : '空闲'}
                </h3>
                {account.currentNodeId && (
                    <p className="text-xs text-blue-600 animate-pulse">
                        当前节点: {account.currentNodeId}
                    </p>
                )}
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false} // 只读模式
                nodesConnectable={false}
                elementsSelectable={true}
            >
                <Background color="#e5e7eb" gap={16} />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
