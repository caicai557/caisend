/**
 * 仪表盘视图
 * 显示关键指标卡片、账号状态、活动时间线
 */

import { AlertCircle, MessageSquare, TrendingUp, Users } from 'lucide-react'

import { useAccountStore } from '../../store/accountStore'
import { useAppStore } from '../../store/appStore'

export function Dashboard() {
  const metrics = useAppStore((state) => state.metrics)
  const accounts = useAccountStore((state) => state.accounts)
  const activities = useAppStore((state) => state.activities)

  const cards = [
    {
      title: '账号总数',
      value: metrics.totalAccounts,
      icon: Users,
      color: 'bg-blue-500',
      change: null
    },
    {
      title: '运行中账号',
      value: metrics.runningAccounts,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: null
    },
    {
      title: '今日回复',
      value: metrics.todayReplies,
      icon: MessageSquare,
      color: 'bg-purple-500',
      change: '+12%'
    },
    {
      title: '今日错误',
      value: metrics.todayErrors,
      icon: AlertCircle,
      color: 'bg-red-500',
      change: null
    }
  ]

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">仪表盘</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          系统运行概览和实时监控
        </p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {card.value}
                  </p>
                  {card.change && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {card.change} 较昨日
                    </p>
                  )}
                </div>
                <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 账号状态列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">账号状态</h2>
        </div>
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无账号数据
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.slice(0, 5).map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        account.status === 'running'
                          ? 'bg-green-500 animate-pulse'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{account.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      今日回复: {account.stats.todayReplies}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      总计: {account.stats.totalReplies}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近活动</h2>
        </div>
        <div className="p-6">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无活动记录
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
