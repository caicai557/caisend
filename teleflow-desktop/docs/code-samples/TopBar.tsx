/**
 * 顶部栏组件
 * 职责：显示产品信息、全局操作按钮
 * 路径：src/renderer/layouts/TopBar.tsx
 */

import { PlayCircle, StopCircle, Folder, Settings } from 'lucide-react'
import { useAccountStore } from '../store/accountStore'
import { accountService } from '../services/accountService'

interface TopBarProps {
  onOpenSettings: () => void
  onOpenLogs: () => void
}

export function TopBar({ onOpenSettings, onOpenLogs }: TopBarProps) {
  const { accounts } = useAccountStore()
  const runningCount = accounts.filter(a => a.status === 'running').length

  const handleStartAll = async () => {
    const stoppedAccounts = accounts.filter(a => a.status === 'stopped' && a.enabled)
    for (const account of stoppedAccounts) {
      await accountService.start(account.id)
    }
  }

  const handleStopAll = async () => {
    const runningAccounts = accounts.filter(a => a.status === 'running')
    for (const account of runningAccounts) {
      await accountService.stop(account.id)
    }
  }

  const openLogsDirectory = async () => {
    await window.electron.openPath('logs')
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm">
      {/* 左侧：产品信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TG</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              Telegram Web 助手控制台
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              运行中: {runningCount} / {accounts.length}
            </p>
          </div>
        </div>
      </div>

      {/* 右侧：全局操作按钮 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleStartAll}
          className="flex items-center space-x-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
          title="启动全部已启用的账号"
        >
          <PlayCircle size={16} />
          <span>启动全部</span>
        </button>

        <button
          onClick={handleStopAll}
          className="flex items-center space-x-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          title="停止全部运行中的账号"
        >
          <StopCircle size={16} />
          <span>停止全部</span>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

        <button
          onClick={openLogsDirectory}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="打开日志目录"
        >
          <Folder size={18} className="text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="系统设置"
        >
          <Settings size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  )
}
