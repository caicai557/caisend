import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TelegramLoginProps {
    accountId?: string;
    onSuccess?: () => void;
}

type LoginStatus = 'idle' | 'opening' | 'need_phone' | 'need_code' | 'logged_in' | 'error';

export function TelegramLogin({ accountId = 'telegram-1', onSuccess }: TelegramLoginProps) {
    const [status, setStatus] = useState<LoginStatus>('idle');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const handleOpenLogin = async () => {
        try {
            setStatus('opening');
            setError('');

            const result = await invoke<string>('telegram_open_login', { accountId });

            if (result === 'logged_in') {
                setStatus('logged_in');
                onSuccess?.();
            } else if (result === 'need_phone') {
                setStatus('need_phone');
            } else if (result === 'need_code') {
                setStatus('need_code');
            } else {
                setError(`未知状态: ${result}`);
                setStatus('error');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '打开登录页面失败');
            setStatus('error');
        }
    };

    const handleSubmitPhone = async () => {
        if (!phone.trim()) {
            setError('请输入手机号');
            return;
        }

        try {
            setError('');
            await invoke('telegram_input_phone', { accountId, phone });
            setStatus('need_code');
        } catch (err) {
            setError(err instanceof Error ? err.message : '提交手机号失败');
        }
    };

    const handleCheckStatus = async () => {
        try {
            setChecking(true);
            const result = await invoke<string>('telegram_check_code_status', { accountId });

            if (result === 'logged_in') {
                setStatus('logged_in');
                onSuccess?.();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '检查状态失败');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">
                Telegram 登录
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                    {error}
                </div>
            )}

            {status === 'idle' && (
                <div className="text-center">
                    <p className="text-gray-400 mb-4">
                        点击下方按钮打开 Telegram Web 登录页面
                    </p>
                    <button
                        onClick={handleOpenLogin}
                        className="px-6 py-3 bg-[var(--accent-primary)] text-black font-semibold rounded-lg hover:brightness-110 transition-all"
                    >
                        打开登录页面
                    </button>
                </div>
            )}

            {status === 'opening' && (
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">正在打开 Telegram Web...</p>
                </div>
            )}

            {status === 'need_phone' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            手机号码
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+86 138 0000 0000"
                            className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-primary)]"
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmitPhone()}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            请输入完整的国际格式手机号，例如：+86 138 0000 0000
                        </p>
                    </div>
                    <button
                        onClick={handleSubmitPhone}
                        className="w-full px-6 py-3 bg-[var(--accent-primary)] text-black font-semibold rounded-lg hover:brightness-110 transition-all"
                    >
                        下一步
                    </button>
                </div>
            )}

            {status === 'need_code' && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-400 text-sm mb-2">
                            📱 验证码已发送到您的手机
                        </p>
                        <p className="text-gray-400 text-sm">
                            请在打开的 Telegram Web 窗口中输入验证码
                        </p>
                    </div>
                    <button
                        onClick={handleCheckStatus}
                        disabled={checking}
                        className="w-full px-6 py-3 bg-[var(--bg-surface)] border border-[var(--glass-border)] text-white font-semibold rounded-lg hover:border-[var(--accent-primary)] transition-all disabled:opacity-50"
                    >
                        {checking ? '检查中...' : '检查登录状态'}
                    </button>
                </div>
            )}

            {status === 'logged_in' && (
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-xl font-semibold text-green-400 mb-2">
                        登录成功！
                    </p>
                    <p className="text-gray-400 text-sm">
                        您的 Telegram 账户已成功连接
                    </p>
                </div>
            )}

            {status === 'error' && (
                <div className="text-center">
                    <button
                        onClick={() => setStatus('idle')}
                        className="px-6 py-3 bg-[var(--bg-surface)] border border-[var(--glass-border)] text-white font-semibold rounded-lg hover:border-[var(--accent-primary)] transition-all"
                    >
                        重试
                    </button>
                </div>
            )}
        </div>
    );
}
