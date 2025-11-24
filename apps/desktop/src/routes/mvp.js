import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { createTestAccount, createTestRule, testAutomation } from '../lib/mvp-api';
export default function MvpDashboard() {
    const [accounts, setAccounts] = useState([]);
    const [rules, setRules] = useState([]);
    const [testResult, setTestResult] = useState('');
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
        if (!accountName.trim())
            return;
        try {
            const account = await createTestAccount(accountName);
            setAccounts([...accounts, account]);
            setAccountName('');
            alert(`账号创建成功: ${account.name} (ID: ${account.id})`);
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            setTestResult(`测试失败: ${error}`);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 p-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsx("h1", { className: "text-3xl font-bold mb-8 text-gray-900", children: "Teleflow MVP \u7BA1\u7406\u9762\u677F" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-800", children: "\u8D26\u53F7\u7BA1\u7406" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u8D26\u53F7\u540D\u79F0" }), _jsx("input", { type: "text", value: accountName, onChange: (e) => setAccountName(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "\u8F93\u5165\u8D26\u53F7\u540D" })] }), _jsx("button", { onClick: handleCreateAccount, className: "w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors", children: "\u521B\u5EFA\u8D26\u53F7" }), _jsxs("div", { className: "border-t pt-4 mt-4", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 mb-2", children: "\u5DF2\u521B\u5EFA\u8D26\u53F7" }), _jsxs("div", { className: "space-y-2 max-h-48 overflow-y-auto", children: [accounts.map((acc) => (_jsxs("div", { className: "p-2 bg-gray-50 rounded text-sm", children: [_jsx("div", { className: "font-medium", children: acc.name }), _jsx("div", { className: "text-xs text-gray-500", children: acc.id })] }, acc.id))), accounts.length === 0 && (_jsx("div", { className: "text-sm text-gray-400", children: "\u6682\u65E0\u8D26\u53F7" }))] })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-800", children: "\u89C4\u5219\u914D\u7F6E" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u9009\u62E9\u8D26\u53F7" }), _jsxs("select", { value: selectedAccountId, onChange: (e) => setSelectedAccountId(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500", children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u8D26\u53F7" }), accounts.map((acc) => (_jsx("option", { value: acc.id, children: acc.name }, acc.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u89E6\u53D1\u5173\u952E\u8BCD" }), _jsx("input", { type: "text", value: triggerPattern, onChange: (e) => setTriggerPattern(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500", placeholder: "\u4F8B\u5982: \u4F60\u597D" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u81EA\u52A8\u56DE\u590D" }), _jsx("textarea", { value: replyText, onChange: (e) => setReplyText(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500", placeholder: "\u4F8B\u5982: \u60A8\u597D\uFF01", rows: 3 })] }), _jsx("button", { onClick: handleCreateRule, className: "w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors", children: "\u521B\u5EFA\u89C4\u5219" }), _jsxs("div", { className: "border-t pt-4 mt-4", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 mb-2", children: "\u5DF2\u521B\u5EFA\u89C4\u5219" }), _jsxs("div", { className: "space-y-2 max-h-48 overflow-y-auto", children: [rules.map((rule) => (_jsxs("div", { className: "p-2 bg-gray-50 rounded text-sm", children: [_jsxs("div", { className: "font-medium", children: [rule.trigger_pattern, " \u2192 ", rule.reply_text] }), _jsxs("div", { className: "text-xs text-gray-500", children: ["\u5EF6\u8FDF: ", rule.delay_min_ms, "-", rule.delay_max_ms, "ms"] })] }, rule.id))), rules.length === 0 && (_jsx("div", { className: "text-sm text-gray-400", children: "\u6682\u65E0\u89C4\u5219" }))] })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 text-gray-800", children: "\u6D4B\u8BD5\u5DE5\u5177" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u6D4B\u8BD5\u8D26\u53F7" }), _jsxs("select", { value: testAccountId, onChange: (e) => setTestAccountId(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500", children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u8D26\u53F7" }), accounts.map((acc) => (_jsx("option", { value: acc.id, children: acc.name }, acc.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u6D4B\u8BD5\u6D88\u606F" }), _jsx("textarea", { value: testMessage, onChange: (e) => setTestMessage(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500", placeholder: "\u8F93\u5165\u6D4B\u8BD5\u6D88\u606F\uFF0C\u4F8B\u5982: \u4F60\u597D\u554A", rows: 3 })] }), _jsx("button", { onClick: handleTestAutomation, className: "w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors", children: "\u6D4B\u8BD5\u89C4\u5219\u5339\u914D" }), testResult && (_jsxs("div", { className: "mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md", children: [_jsx("h3", { className: "text-sm font-medium text-purple-900 mb-1", children: "\u6D4B\u8BD5\u7ED3\u679C" }), _jsx("p", { className: "text-sm text-purple-700", children: testResult })] }))] })] })] }), _jsxs("div", { className: "mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-blue-900 mb-3", children: "\u4F7F\u7528\u8BF4\u660E" }), _jsxs("ol", { className: "list-decimal list-inside space-y-2 text-sm text-blue-800", children: [_jsx("li", { children: "\u5148\u521B\u5EFA\u4E00\u4E2A\u6D4B\u8BD5\u8D26\u53F7" }), _jsx("li", { children: "\u9009\u62E9\u8D26\u53F7\u5E76\u914D\u7F6E\u81EA\u52A8\u56DE\u590D\u89C4\u5219\uFF08\u5173\u952E\u8BCD\u89E6\u53D1\uFF09" }), _jsx("li", { children: "\u5728\u6D4B\u8BD5\u5DE5\u5177\u4E2D\u8F93\u5165\u6D88\u606F\uFF0C\u9A8C\u8BC1\u89C4\u5219\u662F\u5426\u5339\u914D" }), _jsx("li", { children: "\u67E5\u770B\u6D4B\u8BD5\u7ED3\u679C\uFF0C\u786E\u8BA4\u81EA\u52A8\u5316\u903B\u8F91\u6B63\u5E38" })] })] })] }) }));
}
