import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Play, GitBranch, Zap } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
const nodeTemplates = [
    {
        type: 'trigger',
        label: '触发器',
        icon: _jsx(Play, { className: "w-5 h-5" }),
        color: 'bg-green-500',
    },
    {
        type: 'condition',
        label: '条件判断',
        icon: _jsx(GitBranch, { className: "w-5 h-5" }),
        color: 'bg-blue-500',
    },
    {
        type: 'action',
        label: '执行动作',
        icon: _jsx(Zap, { className: "w-5 h-5" }),
        color: 'bg-purple-500',
    },
];
export function NodePalette() {
    const { addNode, nodes } = useWorkflowStore();
    const handleAddNode = (template) => {
        const newNode = {
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
    return (_jsxs("div", { className: "w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto", children: [_jsx("h2", { className: "text-lg font-bold mb-4 text-gray-800", children: "\u8282\u70B9\u5DE5\u5177\u7BB1" }), _jsx("div", { className: "space-y-3", children: nodeTemplates.map((template) => (_jsxs("button", { onClick: () => handleAddNode(template), className: "w-full flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all", children: [_jsx("div", { className: `p-2 rounded ${template.color} text-white`, children: template.icon }), _jsx("span", { className: "font-medium text-gray-700", children: template.label })] }, template.type))) }), _jsxs("div", { className: "mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200", children: [_jsx("h3", { className: "text-sm font-semibold text-blue-900 mb-2", children: "\u63D0\u793A" }), _jsx("p", { className: "text-xs text-blue-700", children: "\u70B9\u51FB\u8282\u70B9\u6DFB\u52A0\u5230\u753B\u5E03\uFF0C\u62D6\u62FD\u8282\u70B9\u8C03\u6574\u4F4D\u7F6E\uFF0C\u8FDE\u63A5\u8282\u70B9\u521B\u5EFA\u6D41\u7A0B\u3002" })] })] }));
}
