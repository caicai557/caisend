import { Play, GitBranch, Zap } from 'lucide-react';
import { useWorkflowStore, type WorkflowNode } from '@/stores/workflowStore';

interface NodeTemplate {
    type: 'trigger' | 'condition' | 'action';
    label: string;
    icon: React.ReactNode;
    color: string;
}

const nodeTemplates: NodeTemplate[] = [
    {
        type: 'trigger',
        label: '触发器',
        icon: <Play className="w-5 h-5" />,
        color: 'bg-green-500',
    },
    {
        type: 'condition',
        label: '条件判断',
        icon: <GitBranch className="w-5 h-5" />,
        color: 'bg-blue-500',
    },
    {
        type: 'action',
        label: '执行动作',
        icon: <Zap className="w-5 h-5" />,
        color: 'bg-purple-500',
    },
];

export function NodePalette() {
    const { addNode, nodes } = useWorkflowStore();

    const handleAddNode = (template: NodeTemplate) => {
        const newNode: WorkflowNode = {
            id: `${template.type}-${Date.now()}`,
            type: template.type,
            position: {
                x: Math.random() * 300 + 100,
                y: Math.random() * 300 + 100,
            },
            data: {
                label: `${template.label} ${nodes.filter(n => n.type === template.type).length + 1}`,
                config: {},
            },
        };
        addNode(newNode);
    };

    return (
        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-800">节点工具箱</h2>

            <div className="space-y-3">
                {nodeTemplates.map((template) => (
                    <button
                        key={template.type}
                        onClick={() => handleAddNode(template)}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                    >
                        <div className={`p-2 rounded ${template.color} text-white`}>
                            {template.icon}
                        </div>
                        <span className="font-medium text-gray-700">{template.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">提示</h3>
                <p className="text-xs text-blue-700">
                    点击节点添加到画布，拖拽节点调整位置，连接节点创建流程。
                </p>
            </div>
        </div>
    );
}
