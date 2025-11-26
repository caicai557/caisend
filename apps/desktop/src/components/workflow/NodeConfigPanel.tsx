import { useState } from 'react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';

export function NodeConfigPanel() {
    const { selectedNode, updateNodeData } = useWorkflowStore();
    const [config, setConfig] = useState(selectedNode?.data.config || {});

    if (!selectedNode) {
        return (
            <div className="w-80 border-l border-gray-200 bg-gray-50 p-6 flex items-center justify-center">
                <p className="text-gray-400 text-sm text-center">
                    点击节点以配置属性
                </p>
            </div>
        );
    }

    const handleSave = () => {
        updateNodeData(selectedNode.id, { config });
    };

    return (
        <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            {/* 头部 */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">节点配置</h3>
                    <button
                        onClick={() => useWorkflowStore.getState().selectNode(null)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedNode.data.label}</p>
            </div>

            {/* 配置表单 */}
            <div className="p-4 space-y-4">
                {/* 节点标签 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        节点名称
                    </label>
                    <input
                        type="text"
                        value={selectedNode.data.label}
                        onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* 根据节点类型显示不同配置 */}
                {selectedNode.type === 'trigger' && (
                    <TriggerConfig config={config} setConfig={setConfig} />
                )}

                {selectedNode.type === 'condition' && (
                    <ConditionConfig config={config} setConfig={setConfig} />
                )}

                {selectedNode.type === 'action' && (
                    <ActionConfig config={config} setConfig={setConfig} />
                )}

                {/* 保存按钮 */}
                <button
                    onClick={handleSave}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                    保存配置
                </button>
            </div>
        </div>
    );
}

// 触发器配置
function TriggerConfig({ config, setConfig }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                消息来源
            </label>
            <select
                value={config.source || 'current'}
                onChange={(e) => setConfig({ ...config, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
                <option value="current">当前账号</option>
                <option value="all">所有账号</option>
            </select>
        </div>
    );
}

// 条件配置
function ConditionConfig({ config, setConfig }: any) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    匹配类型
                </label>
                <select
                    value={config.matchType || 'exact'}
                    onChange={(e) => setConfig({ ...config, matchType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                    <option value="exact">精确匹配</option>
                    <option value="regex">正则表达式</option>
                    <option value="semantic">语义匹配</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {config.matchType === 'semantic' ? '语义意图' : '匹配模式'}
                </label>
                <input
                    type="text"
                    value={config.pattern || ''}
                    onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                    placeholder={config.matchType === 'semantic' ? '例如：问候语' : '例如：你好'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
            </div>
        </>
    );
}

// 动作配置
function ActionConfig({ config, setConfig }: any) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    动作类型
                </label>
                <select
                    value={config.actionType || 'send_message'}
                    onChange={(e) => setConfig({ ...config, actionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                    <option value="send_message">发送消息</option>
                    <option value="click">点击元素</option>
                    <option value="input">输入文本</option>
                    <option value="wait">等待</option>
                </select>
            </div>

            {config.actionType === 'send_message' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        消息内容
                    </label>
                    <textarea
                        value={config.message || ''}
                        onChange={(e) => setConfig({ ...config, message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            )}

            {/* 拟人化参数 */}
            <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">拟人化参数</h4>
                <div className="space-y-2">
                    <div>
                        <label className="block text-xs text-purple-700 mb-1">延迟范围 (ms)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="最小"
                                value={config.delayMin || 1000}
                                onChange={(e) => setConfig({ ...config, delayMin: parseInt(e.target.value) })}
                                className="w-1/2 px-2 py-1 text-sm border border-purple-300 rounded"
                            />
                            <input
                                type="number"
                                placeholder="最大"
                                value={config.delayMax || 3000}
                                onChange={(e) => setConfig({ ...config, delayMax: parseInt(e.target.value) })}
                                className="w-1/2 px-2 py-1 text-sm border border-purple-300 rounded"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-purple-700 mb-1">错误率</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={(config.errorRate || 0) * 100}
                            onChange={(e) => setConfig({ ...config, errorRate: parseInt(e.target.value) / 100 })}
                            className="w-full"
                        />
                        <span className="text-xs text-purple-600">{((config.errorRate || 0) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </>
    );
}
