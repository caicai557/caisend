import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';
export const ActionNode = memo(({ data, selected }) => {
    return (_jsxs("div", { className: `px-4 py-3 rounded-lg border-2 bg-white min-w-[180px] ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'} ${data.isActive ? 'ring-2 ring-green-400' : ''}`, children: [_jsx(Handle, { type: "target", position: Position.Top, className: "w-3 h-3 !bg-purple-500" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 rounded bg-purple-100", children: _jsx(Zap, { className: "w-4 h-4 text-purple-600" }) }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 font-medium", children: "\u6267\u884C\u52A8\u4F5C" }), _jsx("div", { className: "text-sm font-semibold", children: data.label || '发送消息' })] })] }), _jsx(Handle, { type: "source", position: Position.Bottom, className: "w-3 h-3 !bg-purple-500" })] }));
});
ActionNode.displayName = 'ActionNode';
