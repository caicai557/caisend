/**
 * 顶部栏组件
 * 职责：显示产品信息、全局操作按钮
 */

import { Folder, PlayCircle, Settings, StopCircle } from 'lucide-react'

import { accountService } from '../services/accountService'
import { configService } from '../services/configService'
import { useAccountStore } from '../store/accountStore'
import { useAppStore } from '../store/appStore'

export function TopBar() {
  const accounts = useAccountStore((state) => state.accounts)
  const setView = useAppStore((state) => state.setView)
  
  const runningCount = accounts.filter(a => a.status === 'running').length
  const totalCount = accounts.length

  const handleStartAll = async () => {
    const stoppedAccounts = accounts.filter(a => a.status === 'stopped' && a.enabled)
    
    for (const account of stoppedAccounts) {
      try {
        await accountService.start(account.id)
      } catch (error) {
        console.error(`启动账号 ${account.name} 失败:`, error)
      }
    }
  }

  const handleStopAll = async () => {
    const runningAccounts = accounts.filter(a => a.status === 'running')
    
    for (const account of runningAccounts) {
      try {
        await accountService.stop(account.id)
      } catch (error) {
        console.error(`停止账号 ${account.name} 失败:`, error)
      }
    }
  }

  const openLogsDirectory = async () => {
    try {
      await configService.openPath('logs')
    } catch (error) {
      console.error('打开日志目录失败:', error)
    }
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
      {/* 左侧：产品信息 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {/* Logo */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">TG</span>
          </div>
          
          {/* 标题和状态 */}
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              Telegram Web 助手控制台
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center">
                <span className={`w-2 h-2 rounded-full mr-1.5 ${runningCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                运行中: {runningCount} / {totalCount}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 右侧：全局操作按钮 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleStartAll}
          disabled={accounts.filter(a => a.status === 'stopped' && a.enabled).length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          title="启动全部已启用的账号"
        >
          <PlayCircle size={16} />
          <span>启动全部</span>
        </button>

        <button
          onClick={handleStopAll}
          disabled={runningCount === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          title="停止全部运行中的账号"
        >
          <StopCircle size={16} />
          <span>停止全部</span>
        </button>

        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />

        <button
          onClick={openLogsDirectory}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="打开日志目录"
        >
          <Folder size={20} className="text-gray-600 dark:text-gray-400" />
        </button>

        <button
          onClick={() => setView('settings')}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="系统设置"
        >
          <Settings size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </header>
  )
}
