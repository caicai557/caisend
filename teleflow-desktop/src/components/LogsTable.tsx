/**
 * 日志表格组件
 * 显示系统运行日志
 */

import { useState } from 'react'
import { LogEntry, LogLevel } from '../types/log'
import { ChevronDown, ChevronRight, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react'

interface LogsTableProps {
  logs: LogEntry[]
  onSelectLog?: (log: LogEntry) => void
}

export function LogsTable({ logs, onSelectLog }: LogsTableProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return <Info size={16} className="text-gray-500" />
      case LogLevel.INFO:
        return <Info size={16} className="text-blue-500" />
      case LogLevel.WARNING:
        return <AlertTriangle size={16} className="text-yellow-500" />
      case LogLevel.ERROR:
        return <XCircle size={16} className="text-red-500" />
      case LogLevel.CRITICAL:
        return <AlertCircle size={16} className="text-purple-500" />
      default:
        return <Info size={16} className="text-gray-500" />
    }
  }

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'text-gray-600 dark:text-gray-400'
      case LogLevel.INFO:
        return 'text-blue-600 dark:text-blue-400'
      case LogLevel.WARNING:
        return 'text-yellow-600 dark:text-yellow-400'
      case LogLevel.ERROR:
        return 'text-red-600 dark:text-red-400'
      case LogLevel.CRITICAL:
        return 'text-purple-600 dark:text-purple-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'bg-gray-50 dark:bg-gray-900/50'
      case LogLevel.INFO:
        return 'bg-blue-50 dark:bg-blue-900/20'
      case LogLevel.WARNING:
        return 'bg-yellow-50 dark:bg-yellow-900/20'
      case LogLevel.ERROR:
        return 'bg-red-50 dark:bg-red-900/20'
      case LogLevel.CRITICAL:
        return 'bg-purple-50 dark:bg-purple-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-900/50'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <Info size={48} className="mx-auto" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">暂无日志</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {logs.map((log) => {
          const isExpanded = expandedLogs.has(log.id)
          
          return (
            <div
              key={log.id}
              className={`
                ${getLevelBg(log.level)}
                hover:bg-opacity-80 transition-colors
              `}
            >
              {/* 主要日志行 */}
              <div
                className="px-4 py-3 cursor-pointer"
                onClick={() => {
                  toggleExpand(log.id)
                  onSelectLog?.(log)
                }}
              >
                <div className="flex items-start space-x-3">
                  {/* 展开/折叠图标 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(log.id)
                    }}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-500" />
                    )}
                  </button>

                  {/* 级别图标 */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>

                  {/* 日志内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={`text-xs font-medium ${getLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      {log.accountId && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          账号: {log.accountId}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL
                        ? 'font-medium'
                        : ''
                    } text-gray-900 dark:text-white truncate`}>
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* 展开的详细信息 */}
              {isExpanded && (
                <div className="px-4 pb-3 pl-16">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {/* 完整消息 */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">完整消息</p>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                        {log.message}
                      </p>
                    </div>

                    {/* 元数据 */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">元数据</p>
                        <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
