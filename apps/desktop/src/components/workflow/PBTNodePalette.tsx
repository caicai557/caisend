import { PBTNodeType, NODE_THEMES } from '@/types/pbt';

const NODE_TYPES: PBTNodeType[] = [
    'sequence',
    'selector',
    'parallel',
    'condition',
    'action',
    'decorator',
];

export function PBTNodePalette() {
    const handleDragStart = (event: React.DragEvent, nodeType: PBTNodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto h-full">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">PBT 节点库</h3>
                <p className="text-xs text-gray-500 mt-1">拖拽节点到画布构建行为树</p>
            </div>

            <div className="space-y-2">
                {NODE_TYPES.map((nodeType) => {
                    const theme = NODE_THEMES[nodeType];
                    return (
                        <div
                            key={nodeType}
                            draggable
                            onDragStart={(e) => handleDragStart(e, nodeType)}
                            className={`
                group cursor-move p-3 rounded-lg border-2
                bg-gradient-to-br ${theme.bg} ${theme.border}
                hover:shadow-lg hover:scale-105 transition-all duration-200
              `}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-2xl opacity-70 group-hover:opacity-100">
                                    {theme.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-800">
                                        {theme.label}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-0.5">
                                        {getNodeDescription(nodeType)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-blue-800">💡 使用提示</div>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>• 拖拽节点到画布创建</li>
                    <li>• 从上到下连接节点</li>
                    <li>• 点击节点编辑属性</li>
                    <li>• 组合节点必须有子节点</li>
                </ul>
            </div>

            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-xs font-semibold text-purple-800">📚 节点说明</div>
                <ul className="text-xs text-purple-700 mt-2 space-y-1">
                    <li>• <strong>顺序</strong>: 按序执行直到失败</li>
                    <li>• <strong>选择</strong>: 执行直到成功</li>
                    <li>• <strong>并行</strong>: 同时执行所有子节点</li>
                    <li>• <strong>条件</strong>: 判断表达式真假</li>
                    <li>• <strong>行为</strong>: 执行具体动作</li>
                    <li>• <strong>装饰</strong>: 修饰子节点逻辑</li>
                </ul>
            </div>
        </div>
    );
}

function getNodeDescription(nodeType: PBTNodeType): string {
    const descriptions = {
        sequence: '顺序执行所有子节点',
        selector: '执行第一个成功的',
        parallel: '并行执行多个任务',
        condition: '条件判断分支',
        action: '执行具体行为',
        decorator: '修饰子节点',
    };
    return descriptions[nodeType];
}
