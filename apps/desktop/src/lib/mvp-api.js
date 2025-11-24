import { invoke } from '@tauri-apps/api/core';
// 模拟数据生成器
const mockId = () => Math.random().toString(36).substring(7);
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;
// 创建测试账号
export async function createTestAccount(name) {
    if (!isTauri()) {
        console.log('Mock Mode: createTestAccount', name);
        await new Promise(r => setTimeout(r, 500));
        return { id: mockId(), name, status: 'Active' };
    }
    try {
        return await invoke('create_test_account', { name });
    }
    catch (e) {
        console.warn('Tauri invoke failed, using mock:', e);
        return { id: mockId(), name, status: 'Active' };
    }
}
// 创建测试规则
export async function createTestRule(accountId, triggerPattern, replyText) {
    if (!isTauri()) {
        console.log('Mock Mode: createTestRule', { accountId, triggerPattern, replyText });
        await new Promise(r => setTimeout(r, 500));
        return {
            id: mockId(),
            account_id: accountId,
            trigger_type: 'Keyword',
            trigger_pattern: triggerPattern,
            reply_text: replyText,
            delay_min_ms: 1000,
            delay_max_ms: 3000,
            is_enabled: true
        };
    }
    try {
        return await invoke('create_test_rule', {
            account_id: accountId,
            trigger_pattern: triggerPattern,
            reply_text: replyText
        });
    }
    catch (e) {
        console.warn('Tauri invoke failed, using mock:', e);
        return {
            id: mockId(),
            account_id: accountId,
            trigger_type: 'Keyword',
            trigger_pattern: triggerPattern,
            reply_text: replyText,
            delay_min_ms: 1000,
            delay_max_ms: 3000,
            is_enabled: true
        };
    }
}
// 测试自动化
export async function testAutomation(accountId, testMessage) {
    if (!isTauri()) {
        console.log('Mock Mode: testAutomation', { accountId, testMessage });
        await new Promise(r => setTimeout(r, 800));
        if (testMessage.includes('你好')) {
            return `Matched rule: 你好 -> Reply: "您好！"`;
        }
        return "No rule matched";
    }
    try {
        return await invoke('test_automation', {
            account_id: accountId,
            test_message: testMessage
        });
    }
    catch (e) {
        console.warn('Tauri invoke failed, using mock:', e);
        if (testMessage.includes('你好')) {
            return `Matched rule: 你好 -> Reply: "您好！"`;
        }
        return "No rule matched (Mock)";
    }
}
// 获取系统信息
export async function getSystemInfo() {
    try {
        return await invoke('get_system_info');
    }
    catch (e) {
        return { core_version: '0.0.0-mock', initialized: true };
    }
}
export async function startSession(accountId) {
    if (!isTauri()) {
        console.log('Mock Mode: startSession', accountId);
        await new Promise(r => setTimeout(r, 500));
        return;
    }
    await invoke('start_session', { account_id: accountId });
}
