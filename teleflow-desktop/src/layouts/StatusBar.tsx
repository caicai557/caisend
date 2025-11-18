/**
 * 底部状态栏组件
 * 职责：显示系统状态信息
 */

import { Wifi, WifiOff, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAccountStore } from '../store/accountStore'
import { useAppStore } from '../store/appStore'

export function StatusBar() {
  const statusMessage = useAppStore((state) => state.statusMessage)
  const metrics = useAppStore((state) => state.metrics)
  const accounts = useAccountStore((state) => state.accounts)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const runningAccounts = accounts.filter(a => a.status === 'running')
  const currentActivity = runningAccounts.length > 0
    ? `正在运行 ${runningAccounts.length} 个账号`
    : statusMessage || '系统就绪'

  return (
    <footer className="h-8 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-xs flex-shrink-0">
      {/* 左侧：当前状态信息 */}
      <div className="flex items-center space-x-4">
        <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${runningAccounts.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{currentActivity}</span>
        </span>
      </div>

      {/* 右侧：统计信息 + 时间 + 网络状态 */}
      <div className="flex items-center space-x-6">
        {/* 今日回复数 */}
        <span className="text-gray-600 dark:text-gray-400">
          今日回复: <span className="font-medium text-gray-900 dark:text-white">{metrics.todayReplies}</span>
        </span>

        {/* 当前时间 */}
        <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-1.5">
          <Clock size={12} />
          <span>{formatTime(currentTime)}</span>
        </span>

        {/* 网络状态 */}
        <span
          className={`flex items-center space-x-1.5 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          title={isOnline ? '网络已连接' : '网络已断开'}
        >
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{isOnline ? '在线' : '离线'}</span>
        </span>
      </div>
    </footer>
  )
}
