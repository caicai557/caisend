-- Phase 2 (Milestone B): 扩展 accounts 表以支持多账号工作区
-- 创建时间: 2025-12-01

-- 添加 Telegram 相关字段
ALTER TABLE accounts ADD COLUMN telegram_handle TEXT;
ALTER TABLE accounts ADD COLUMN workspace_path TEXT;
ALTER TABLE accounts ADD COLUMN default_locale TEXT DEFAULT 'zh-CN';

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_accounts_telegram ON accounts(telegram_handle);

-- 注释:
-- telegram_handle: Telegram 账号标识,用于窗口监听时的账号匹配
-- workspace_path: 工作区目录路径,如 data/account_id/
-- default_locale: 默认语言,用于话术推荐和界面显示
