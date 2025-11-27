import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';
export const ConditionNode = memo(({ data, selected }) => {
    return (_jsxs("div", { className: `px-4 py-3 rounded-lg border-2 bg-white min-w-[180px] ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'} ${data.isActive ? 'ring-2 ring-green-400' : ''}`, children: [_jsx(Handle, { type: "target", position: Position.Top, className: "w-3 h-3 !bg-blue-500" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 rounded bg-blue-100", children: _jsx(GitBranch, { className: "w-4 h-4 text-blue-600" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 font-medium", children: "\u6761\u4EF6\u5224\u65AD" }), _jsx("div", { className: "text-sm font-semibold", children: data.label || '匹配条件' })] })] }), _jsx(Handle, { type: "source", position: Position.Bottom, className: "w-3 h-3 !bg-blue-500" })] }));
});
ConditionNode.displayName = 'ConditionNode';
