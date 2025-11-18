/**
 * 账号详情视图
 * 显示账号信息、Tab 导航（规则、状态、日志）
 */

import { PlayCircle, StopCircle, Settings as SettingsIcon, Plus } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { RuleForm } from '../../components/RuleForm'
import { RulesTable } from '../../components/RulesTable'
import { RuleTestDialog } from '../../components/RuleTestDialog'
import { StatusIndicator } from '../../components/StatusIndicator'
import { useRuleManager } from '../../hooks/useRuleManager'
import { accountService } from '../../services/accountService'
import { useAccountStore } from '../../store/accountStore'

interface AccountDetailProps {
  accountId: string
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const account = useAccountStore((state) => 
    state.accounts.find(a => a.id === accountId)
  )
  const [activeTab, setActiveTab] = useState<'rules' | 'status' | 'logs'>('rules')

  const {
    rules,
    showCreateDialog,
    showEditDialog,
    showDeleteDialog,
    showTestDialog,
    selectedRule,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggle,
    handleTest,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    openTestDialog,
    closeDialogs
  } = useRuleManager()

  if (!account) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">账号不存在</p>
        </div>
      </div>
    )
  }

  const handleStart = async () => {
    try {
      await accountService.start(account.id)
    } catch (error) {
      console.error('启动账号失败:', error)
    }
  }

  const handleStop = async () => {
    try {
      await accountService.stop(account.id)
    } catch (error) {
      console.error('停止账号失败:', error)
    }
  }

  const tabs = [
    { id: 'rules', label: '规则与聊天' },
    { id: 'status', label: '运行状态' },
    { id: 'logs', label: '调试与日志' }
  ] as const

  return (
    <div className="flex flex-col h-full">
      {/* 账号信息头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <StatusIndicator status={account.status} size="large" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {account.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {account.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {account.status === 'stopped' ? (
              <button
                onClick={handleStart}
                disabled={!account.enabled}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <PlayCircle size={16} />
                <span>启动</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <StopCircle size={16} />
                <span>停止</span>
              </button>
            )}

            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <SettingsIcon size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex space-x-1 mt-4 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t border-x border-gray-200 dark:border-gray-700 border-b-white dark:border-b-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {activeTab === 'rules' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  自动回复规则
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  共 {rules.length} 条规则
                </p>
              </div>
              <button
                onClick={openCreateDialog}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <span>添加规则</span>
              </button>
            </div>

            <RulesTable
              rules={rules}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onToggle={handleToggle}
              onTest={openTestDialog}
            />
          </div>
        )}

        {activeTab === 'status' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  今日回复
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {account.stats.todayReplies}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  总回复数
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {account.stats.totalReplies}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  今日错误
                </h3>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {account.stats.todayErrors}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  运行时长
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(account.stats.uptime / 3600)}h
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                调试日志
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                日志功能开发中...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 规则对话框 */}
      <Modal
        show={showCreateDialog}
        onClose={closeDialogs}
        title="创建规则"
        size="lg"
      >
        <RuleForm
          onSubmit={handleCreate}
          onCancel={closeDialogs}
        />
      </Modal>

      <Modal
        show={showEditDialog}
        onClose={closeDialogs}
        title="编辑规则"
        size="lg"
      >
        {selectedRule && (
          <RuleForm
            rule={selectedRule}
            onSubmit={handleEdit}
            onCancel={closeDialogs}
          />
        )}
      </Modal>

      <ConfirmDialog
        show={showDeleteDialog}
        onClose={closeDialogs}
        onConfirm={handleDelete}
        title="删除规则"
        message={`确定要删除规则"${selectedRule?.name}"吗？此操作无法撤销。`}
        confirmText="删除"
        danger
      />

      <RuleTestDialog
        show={showTestDialog}
        rule={selectedRule}
        onClose={closeDialogs}
        onTest={handleTest}
      />
    </div>
  )
}
