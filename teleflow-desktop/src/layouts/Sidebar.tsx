/**
 * 左侧栏组件
 * 职责：账号列表 + 导航菜单
 */

import { LayoutDashboard, FileText, Settings2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { AccountForm } from '../components/AccountForm'
import { AccountList } from '../components/AccountList'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { useAccountManager } from '../hooks/useAccountManager'
import { useAccountStore } from '../store/accountStore'
import { useAppStore } from '../store/appStore'

type ViewId = 'dashboard' | 'logs' | 'settings'

export function Sidebar() {
  const currentView = useAppStore((state) => state.currentView)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const setView = useAppStore((state) => state.setView)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const selectAccount = useAccountStore((state) => state.selectAccount)

  const {
    showCreateDialog,
    showEditDialog,
    showDeleteDialog,
    selectedAccount,
    handleCreate,
    handleEdit,
    handleDelete,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialogs
  } = useAccountManager()

  const navItems: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'logs', label: '运行日志', icon: FileText },
    { id: 'settings', label: '系统设置', icon: Settings2 },
  ]

  const handleNavClick = (viewId: ViewId) => {
    setView(viewId)
    selectAccount(null) // 清除账号选择
  }

  return (
    <aside
      className={`
        relative flex-shrink-0
        bg-gray-50 dark:bg-gray-900 
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300
        ${sidebarCollapsed ? 'w-16' : 'w-80'}
      `}
    >
      {/* 折叠/展开按钮 */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
        title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" />
        )}
      </button>

      <div className="flex flex-col h-full">
        {/* 账号列表区域 */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 账号列表标题 */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  账号列表
                </h2>
                <button
                  onClick={openCreateDialog}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="添加账号"
                >
                  <Plus size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* 账号列表 */}
            <div className="flex-1 overflow-y-auto">
              <AccountList 
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <div className={`border-t border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'py-4' : 'py-3'}`}>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center
                    ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5 space-x-3'}
                    text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* 创建账号对话框 */}
      <Modal
        show={showCreateDialog}
        onClose={closeDialogs}
        title="创建账号"
        size="md"
      >
        <AccountForm
          onSubmit={handleCreate}
          onCancel={closeDialogs}
        />
      </Modal>

      {/* 编辑账号对话框 */}
      <Modal
        show={showEditDialog}
        onClose={closeDialogs}
        title="编辑账号"
        size="md"
      >
        {selectedAccount && (
          <AccountForm
            account={selectedAccount}
            onSubmit={handleEdit}
            onCancel={closeDialogs}
          />
        )}
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        show={showDeleteDialog}
        onClose={closeDialogs}
        onConfirm={handleDelete}
        title="删除账号"
        message={`确定要删除账号"${selectedAccount?.name}"吗？此操作无法撤销。`}
        confirmText="删除"
        danger
      />
    </aside>
  )
}
