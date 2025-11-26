import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 bg-white min-w-[180px] ${selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'
                } ${data.isActive ? 'ring-2 ring-green-400' : ''}`}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100">
                    <GitBranch className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <div className="text-xs text-gray-500 font-medium">条件判断</div>
                    <div className="text-sm font-semibold">{data.label || '匹配条件'}</div>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
        </div>
    );
});

ConditionNode.displayName = 'ConditionNode';
