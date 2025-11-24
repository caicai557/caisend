import { useState } from 'react';
import { createTestAccount, createTestRule, testAutomation, type Account, type Rule } from '../lib/mvp-api';

export default function MvpDashboard() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [testResult, setTestResult] = useState<string>('');

    // 账号表单
    const [accountName, setAccountName] = useState('');

    // 规则表单
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [triggerPattern, setTriggerPattern] = useState('');
    const [replyText, setReplyText] = useState('');

    // 测试表单
    const [testAccountId, setTestAccountId] = useState('');
    const [testMessage, setTestMessage] = useState('');

    const handleCreateAccount = async () => {
        if (!accountName.trim()) return;
        try {
            const account = await createTestAccount(accountName);
            setAccounts([...accounts, account]);
            setAccountName('');
            alert(`账号创建成功: ${account.name} (ID: ${account.id})`);
        } catch (error) {
            alert(`创建失败: ${error}`);
        }
    };

    const handleCreateRule = async () => {
        if (!selectedAccountId || !triggerPattern || !replyText) {
            alert('请填写完整信息');
            return;
        }
        try {
            const rule = await createTestRule(selectedAccountId, triggerPattern, replyText);
            setRules([...rules, rule]);
            setTriggerPattern('');
            setReplyText('');
            alert(`规则创建成功: ${rule.id}`);
        } catch (error) {
            alert(`创建失败: ${error}`);
        }
    };

    const handleTestAutomation = async () => {
        if (!testAccountId || !testMessage) {
            alert('请填写测试信息');
            return;
        }
        try {
            const result = await testAutomation(testAccountId, testMessage);
            setTestResult(result);
        } catch (error) {
            setTestResult(`测试失败: ${error}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">Teleflow MVP 管理面板</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 账号管理 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">账号管理</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    账号名称
                                </label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="输入账号名"
                                />
                            </div>
                            <button
                                onClick={handleCreateAccount}
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                创建账号
                            </button>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">已创建账号</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {accounts.map((acc) => (
                                        <div key={acc.id} className="p-2 bg-gray-50 rounded text-sm">
                                            <div className="font-medium">{acc.name}</div>
                                            <div className="text-xs text-gray-500">{acc.id}</div>
                                        </div>
                                    ))}
                                    {accounts.length === 0 && (
                                        <div className="text-sm text-gray-400">暂无账号</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 规则配置 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">规则配置</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    选择账号
                                </label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">请选择账号</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    触发关键词
                                </label>
                                <input
                                    type="text"
                                    value={triggerPattern}
                                    onChange={(e) => setTriggerPattern(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="例如: 你好"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    自动回复
                                </label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="例如: 您好！"
                                    rows={3}
                                />
                            </div>
                            <button
                                onClick={handleCreateRule}
                                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                创建规则
                            </button>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">已创建规则</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {rules.map((rule) => (
                                        <div key={rule.id} className="p-2 bg-gray-50 rounded text-sm">
                                            <div className="font-medium">{rule.trigger_pattern} → {rule.reply_text}</div>
                                            <div className="text-xs text-gray-500">延迟: {rule.delay_min_ms}-{rule.delay_max_ms}ms</div>
                                        </div>
                                    ))}
                                    {rules.length === 0 && (
                                        <div className="text-sm text-gray-400">暂无规则</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 测试工具 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">测试工具</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    测试账号
                                </label>
                                <select
                                    value={testAccountId}
                                    onChange={(e) => setTestAccountId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">请选择账号</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    测试消息
                                </label>
                                <textarea
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="输入测试消息，例如: 你好啊"
                                    rows={3}
                                />
                            </div>
                            <button
                                onClick={handleTestAutomation}
                                className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
                            >
                                测试规则匹配
                            </button>

                            {testResult && (
                                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                                    <h3 className="text-sm font-medium text-purple-900 mb-1">测试结果</h3>
                                    <p className="text-sm text-purple-700">{testResult}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 使用说明 */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>先创建一个测试账号</li>
                        <li>选择账号并配置自动回复规则（关键词触发）</li>
                        <li>在测试工具中输入消息，验证规则是否匹配</li>
                        <li>查看测试结果，确认自动化逻辑正常</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
