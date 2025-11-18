/**
 * 账号列表组件
 * 显示所有账号，支持选中、右键菜单
 */

import { useState } from 'react'
import { Edit, Trash2, Folder, PlayCircle, StopCircle } from 'lucide-react'
import { useAccountStore } from '../store/accountStore'
import { useAppStore } from '../store/appStore'
import { StatusIndicator } from './StatusIndicator'
import { ContextMenu, ContextMenuItem } from './ContextMenu'
import { Account } from '../types/account'
import { accountService } from '../services/accountService'

interface AccountListProps {
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}

export function AccountList({ onEdit, onDelete }: AccountListProps) {
  const accounts = useAccountStore((state) => state.accounts)
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId)
  const selectAccount = useAccountStore((state) => state.selectAccount)
  const setView = useAppStore((state) => state.setView)

  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    account: Account | null
  }>({
    show: false,
    x: 0,
    y: 0,
    account: null
  })

  const handleAccountClick = (accountId: string) => {
    selectAccount(accountId)
    setView('account')
  }

  const handleContextMenu = (e: React.MouseEvent, account: Account) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      account
    })
  }

  const handleStart = async (account: Account) => {
    try {
      await accountService.start(account.id)
    } catch (error) {
      console.error('启动失败:', error)
    }
  }

  const handleStop = async (account: Account) => {
    try {
      await accountService.stop(account.id)
    } catch (error) {
      console.error('停止失败:', error)
    }
  }

  const getContextMenuItems = (account: Account): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []

    // 启动/停止
    if (account.status === 'stopped') {
      items.push({
        id: 'start',
        label: '启动',
        icon: PlayCircle,
        onClick: () => handleStart(account),
        disabled: !account.enabled
      })
    } else {
      items.push({
        id: 'stop',
        label: '停止',
        icon: StopCircle,
        onClick: () => handleStop(account)
      })
    }

    items.push({
      id: 'divider1',
      label: '',
      onClick: () => {},
      divider: true
    })

    // 编辑
    items.push({
      id: 'edit',
      label: '编辑',
      icon: Edit,
      onClick: () => onEdit?.(account)
    })

    // 打开目录
    items.push({
      id: 'open-folder',
      label: '打开配置目录',
      icon: Folder,
      onClick: () => {
        // TODO: 实现打开目录功能
        console.log('打开目录:', account.profilePath)
      }
    })

    items.push({
      id: 'divider2',
      label: '',
      onClick: () => {},
      divider: true
    })

    // 删除
    items.push({
      id: 'delete',
      label: '删除',
      icon: Trash2,
      onClick: () => onDelete?.(account),
      danger: true
    })

    return items
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">暂无账号</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">点击右上角 + 添加账号</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="py-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => handleAccountClick(account.id)}
            onContextMenu={(e) => handleContextMenu(e, account)}
            className={`
              w-full px-4 py-3 flex items-center space-x-3
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors cursor-pointer
              ${selectedAccountId === account.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
            `}
          >
          {/* 状态指示器 */}
          <StatusIndicator status={account.status} size="small" />

          {/* 账号信息 */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {account.name}
              </p>
              {!account.enabled && (
                <span className="text-xs text-gray-400 dark:text-gray-500">已禁用</span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {account.phone}
            </p>
            {account.stats.todayReplies > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                今日 {account.stats.todayReplies} 次回复
              </p>
            )}
          </div>

          {/* 右侧图标 */}
          {account.status === 'running' && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
        </button>
      ))}
    </div>

      {/* 右键菜单 */}
      {contextMenu.show && contextMenu.account && (
        <ContextMenu
          show={contextMenu.show}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
          items={getContextMenuItems(contextMenu.account)}
        />
      )}
    </>
  )
}
