/**
 * 主布局组件
 * 职责：管理整体布局结构（TopBar + Sidebar + Content + StatusBar）
 */

import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { Dashboard } from '../views/Dashboard'
import { AccountDetail } from '../views/AccountDetail'
import { LogsView } from '../views/Logs'
import { SettingsView } from '../views/Settings'
import { useAppStore } from '../store/appStore'
import { useAccountStore } from '../store/accountStore'

export function MainLayout() {
  const currentView = useAppStore((state) => state.currentView)
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)

  // 渲染当前视图
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'account':
        return selectedAccountId ? (
          <AccountDetail accountId={selectedAccountId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                请选择一个账号
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                在左侧列表中点击账号查看详情
              </p>
            </div>
          </div>
        )
      case 'logs':
        return <LogsView />
      case 'settings':
        return <SettingsView />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 顶部栏 */}
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧栏 */}
        <Sidebar />

        {/* 主内容区 */}
        <main
          className={`
            flex-1 overflow-auto 
            bg-white dark:bg-gray-800
            transition-all duration-300
            ${sidebarCollapsed ? 'ml-0' : 'ml-0'}
          `}
        >
          {renderContent()}
        </main>
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  )
}
