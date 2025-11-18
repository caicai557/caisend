/**
 * 右键菜单组件
 * 可定制的上下文菜单
 */

import { useEffect, useRef } from 'react'
import { LucideIcon } from 'lucide-react'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  danger?: boolean
  divider?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  show: boolean
  x: number
  y: number
  onClose: () => void
  items: ContextMenuItem[]
}

export function ContextMenu({ show, x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleScroll = () => {
      onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [show, onClose])

  if (!show) return null

  // 确保菜单不会超出窗口边界
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 1000
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="h-px bg-gray-200 dark:bg-gray-700 my-1"
            />
          )
        }

        const Icon = item.icon

        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            className={`
              w-full flex items-center space-x-2 px-4 py-2 text-sm
              transition-colors text-left
              ${item.disabled
                ? 'opacity-50 cursor-not-allowed'
                : item.danger
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
              }
            `}
          >
            {Icon && <Icon size={16} />}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
