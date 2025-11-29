import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { PBTNodeData } from '@/types/pbt';
import { NODE_THEMES } from '@/types/pbt';

export const PBTNode = memo(({ data, selected }: NodeProps<PBTNodeData>) => {
    const theme = NODE_THEMES[data.type];

    return (
        <div
            className={`
        relative min-w-[180px] px-4 py-3 rounded-lg border-2
       bg-gradient-to-br ${theme.bg} ${theme.border}
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        backdrop-blur-sm shadow-lg transition-all duration-200
        hover:shadow-xl hover:scale-105
      `}
        >
            {/* Top Handle (Input) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
            />

            {/* Node Content */}
            <div className="flex items-center gap-3">
                <div className="text-2xl opacity-80">{theme.icon}</div>
                <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {theme.label}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">
                        {data.label || '未命名节点'}
                    </div>
                    {data.description && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {data.description}
                        </div>
                    )}
                </div>
            </div>

            {/* Action/Condition specific indicators */}
            {data.type === 'action' && data.actionType && (
                <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    ⚡ {data.actionType}
                </div>
            )}
            {data.type === 'condition' && data.expression && (
                <div className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-mono">
                    {data.expression}
                </div>
            )}

            {/* Bottom Handle (Output) - only for composite/decorator nodes */}
            {(data.type === 'sequence' || data.type === 'selector' || data.type === 'parallel' || data.type === 'decorator') && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
                />
            )}
        </div>
    );
});

PBTNode.displayName = 'PBTNode';

// Define node types for React Flow
export const nodeTypes = {
    'pbt-node': PBTNode,
};
