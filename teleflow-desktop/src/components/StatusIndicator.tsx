/**
 * 状态指示器组件
 * 显示账号运行状态（颜色点 + 文字）
 */

import { AccountStatus } from '../types/account'

interface StatusIndicatorProps {
  status: AccountStatus
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
}

const statusConfig: Record<AccountStatus, {
  color: string
  label: string
  textColor: string
  pulse?: boolean
}> = {
  [AccountStatus.STOPPED]: {
    color: 'bg-gray-400',
    label: '已停止',
    textColor: 'text-gray-600 dark:text-gray-400',
    pulse: false
  },
  [AccountStatus.RUNNING]: {
    color: 'bg-green-500',
    label: '运行中',
    textColor: 'text-green-600 dark:text-green-400',
    pulse: true
  },
  [AccountStatus.ERROR]: {
    color: 'bg-red-500',
    label: '错误',
    textColor: 'text-red-600 dark:text-red-400',
    pulse: true
  },
  [AccountStatus.STARTING]: {
    color: 'bg-yellow-500',
    label: '启动中',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    pulse: true
  },
  [AccountStatus.STOPPING]: {
    color: 'bg-orange-500',
    label: '停止中',
    textColor: 'text-orange-600 dark:text-orange-400',
    pulse: true
  }
}

const sizeConfig = {
  small: 'w-2 h-2',
  medium: 'w-3 h-3',
  large: 'w-4 h-4'
}

export function StatusIndicator({ status, size = 'medium', showLabel = false }: StatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeClass = sizeConfig[size]

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`
          ${sizeClass}
          ${config.color}
          rounded-full
          ${config.pulse ? 'animate-pulse' : ''}
          flex-shrink-0
        `}
        title={config.label}
      />
      {showLabel && (
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.label}
        </span>
      )}
    </div>
  )
}
