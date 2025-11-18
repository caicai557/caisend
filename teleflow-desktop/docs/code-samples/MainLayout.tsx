/**
 * 主布局组件
 * 职责：管理整体布局结构（TopBar + Sidebar + Content + StatusBar）
 * 路径：src/renderer/layouts/MainLayout.tsx
 */

import { useState } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { Dashboard } from '../views/Dashboard'
import { AccountDetail } from '../views/AccountDetail'
import { LogsView } from '../views/Logs'
import { SettingsView } from '../views/Settings'

type ViewType = 'dashboard' | 'account' | 'logs' | 'settings'

export function MainLayout() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 渲染当前视图
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'account':
        return selectedAccountId ? (
          <AccountDetail accountId={selectedAccountId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            请在左侧选择一个账号
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部栏 */}
      <TopBar 
        onOpenSettings={() => setCurrentView('settings')}
        onOpenLogs={() => setCurrentView('logs')}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧栏 */}
        <Sidebar
          collapsed={sidebarCollapsed}
          currentView={currentView}
          selectedAccountId={selectedAccountId}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelectView={setCurrentView}
          onSelectAccount={(accountId) => {
            setSelectedAccountId(accountId)
            setCurrentView('account')
          }}
        />

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-800">
          {renderContent()}
        </main>
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  )
}
