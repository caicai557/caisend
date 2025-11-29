import { useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import type { PBTNodeData } from '@/types/pbt';
import { NODE_THEMES } from '@/types/pbt';
import { X } from 'lucide-react';

interface PropertyPanelProps {
    selectedNode: Node<PBTNodeData> | null;
    onUpdateNode: (id: string, data: Partial<PBTNodeData>) => void;
    onClose: () => void;
}

export function PropertyPanel({ selectedNode, onUpdateNode, onClose }: PropertyPanelProps) {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [actionType, setActionType] = useState('');
    const [expression, setExpression] = useState('');

    useEffect(() => {
        if (selectedNode) {
            setLabel(selectedNode.data.label);
            setDescription(selectedNode.data.description || '');
            setActionType(selectedNode.data.actionType || '');
            setExpression(selectedNode.data.expression || '');
        }
    }, [selectedNode]);

    if (!selectedNode) {
        return (
            <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">👈</div>
                    <p className="text-sm">选择一个节点</p>
                    <p className="text-xs mt-1">查看和编辑属性</p>
                </div>
            </div>
        );
    }

    const theme = NODE_THEMES[selectedNode.data.type];

    const handleSave = () => {
        const updates: Partial<PBTNodeData> = {
            label,
            description,
        };

        if (selectedNode.data.type === 'action' && actionType) {
            updates.actionType = actionType;
        }

        if (selectedNode.data.type === 'condition' && expression) {
            updates.expression = expression;
        }

        onUpdateNode(selectedNode.id, updates);
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className={`p-4 border-b border-gray-200 bg-gradient-to-br ${theme.bg}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="text-2xl">{theme.icon}</div>
                        <h3 className="font-semibold text-gray-800">{theme.label}节点</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <div className="text-xs text-gray-600">ID: {selectedNode.id}</div>
            </div>

            {/* Properties Form */}
            <div className="p-4 space-y-4">
                {/* Label */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        节点名称 *
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={handleSave}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入节点名称"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        描述
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleSave}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="添加节点描述..."
                    />
                </div>

                {/* Action-specific properties */}
                {selectedNode.data.type === 'action' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            行为类型 *
                        </label>
                        <select
                            value={actionType}
                            onChange={(e) => {
                                setActionType(e.target.value);
                                onUpdateNode(selectedNode.id, { actionType: e.target.value });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">选择行为...</option>
                            <option value="send_message">发送消息</option>
                            <option value="wait">等待</option>
                            <option value="http_request">HTTP请求</option>
                            <option value="detect_intent">意图识别</option>
                            <option value="click">点击元素</option>
                            <option value="type">输入文本</option>
                            <option value="navigate">页面导航</option>
                            <option value="screenshot">截图</option>
                        </select>

                        {actionType && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs font-semibold text-blue-800 mb-1">
                                    参数配置
                                </div>
                                <div className="text-xs text-blue-700">
                                    {getActionHint(actionType)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Condition-specific properties */}
                {selectedNode.data.type === 'condition' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            条件表达式 *
                        </label>
                        <input
                            type="text"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            onBlur={handleSave}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="例如: message.contains('hello')"
                        />
                        <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="text-xs font-semibold text-yellow-800 mb-1">
                                💡 表达式提示
                            </div>
                            <ul className="text-xs text-yellow-700 space-y-0.5">
                                <li>• 使用 message. 访问消息内容</li>
                                <li>• 使用 context. 访问上下文</li>
                                <li>• 支持 ==, !=, &gt;, &lt; 等运算符</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Decorator-specific properties */}
                {selectedNode.data.type === 'decorator' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            装饰器类型
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">选择装饰器...</option>
                            <option value="repeat">重复执行</option>
                            <option value="retry">失败重试</option>
                            <option value="timeout">超时限制</option>
                            <option value="inverter">结果反转</option>
                        </select>
                    </div>
                )}

                {/* Composite node info */}
                {(selectedNode.data.type === 'sequence' ||
                    selectedNode.data.type === 'selector' ||
                    selectedNode.data.type === 'parallel') && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-xs font-semibold text-gray-700 mb-1">
                                组合节点说明
                            </div>
                            <div className="text-xs text-gray-600">
                                {getCompositeHint(selectedNode.data.type)}
                            </div>
                        </div>
                    )}
            </div>

            {/* Node Type Info */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs font-semibold text-gray-700 mb-2">节点类型</div>
                <div className="text-xs text-gray-600">
                    {getNodeTypeDescription(selectedNode.data.type)}
                </div>
            </div>
        </div>
    );
}

function getActionHint(actionType: string): string {
    const hints: Record<string, string> = {
        send_message: '在后端配置消息内容和目标',
        wait: '设置等待时长（毫秒）',
        http_request: '配置URL、方法和请求体',
        detect_intent: '使用NLP识别用户意图',
        click: '指定元素选择器',
        type: '设置输入文本内容',
        navigate: '设置目标URL',
        screenshot: '保存截图到指定路径',
    };
    return hints[actionType] || '请在后端配置具体参数';
}

function getCompositeHint(nodeType: string): string {
    const hints: Record<string, string> = {
        sequence: '从左到右执行所有子节点，任一失败则停止',
        selector: '依次执行子节点，直到某个成功',
        parallel: '同时执行所有子节点',
    };
    return hints[nodeType] || '';
}

function getNodeTypeDescription(nodeType: string): string {
    const descriptions: Record<string, string> = {
        sequence: '顺序节点：按顺序执行子节点，全部成功则成功',
        selector: '选择节点：尝试执行子节点，任一成功则成功',
        parallel: '并行节点：同时执行所有子节点',
        condition: '条件节点：根据表达式结果决定执行流程',
        action: '行为节点：执行具体的动作或操作',
        decorator: '装饰器节点：修改子节点的执行行为',
    };
    return descriptions[nodeType] || '';
}
