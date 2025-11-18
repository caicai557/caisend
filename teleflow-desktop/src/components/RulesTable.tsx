/**
 * 规则表格组件
 * 显示和管理自动回复规则
 */

import { useState } from 'react'
import { Edit, Trash2, Copy, PlayCircle, Power, PowerOff } from 'lucide-react'
import { Rule, TriggerType, ResponseType } from '../types/rule'

interface RulesTableProps {
  rules: Rule[]
  onEdit: (rule: Rule) => void
  onDelete: (rule: Rule) => void
  onToggle: (rule: Rule) => void
  onTest?: (rule: Rule) => void
}

export function RulesTable({ rules, onEdit, onDelete, onToggle, onTest }: RulesTableProps) {
  const [sortBy, setSortBy] = useState<'priority' | 'name' | 'triggers'>('priority')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const getTriggerLabel = (type: TriggerType): string => {
    const labels = {
      [TriggerType.KEYWORD]: '关键词',
      [TriggerType.REGEX]: '正则',
      [TriggerType.ALL]: '全部',
      [TriggerType.MENTION]: '@提及',
      [TriggerType.PRIVATE]: '私聊',
      [TriggerType.GROUP]: '群聊'
    }
    return labels[type] || type
  }

  const getResponseLabel = (type: ResponseType): string => {
    const labels = {
      [ResponseType.TEXT]: '文本',
      [ResponseType.IMAGE]: '图片',
      [ResponseType.FILE]: '文件',
      [ResponseType.FORWARD]: '转发',
      [ResponseType.IGNORE]: '忽略'
    }
    return labels[type] || type
  }

  const sortedRules = [...rules].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'priority':
        comparison = a.priority - b.priority
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'triggers':
        comparison = a.stats.totalTriggers - b.stats.totalTriggers
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  if (rules.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
        <div className="text-gray-400 dark:text-gray-500 mb-3">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">暂无规则</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">点击右上角按钮创建第一条规则</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 表头 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortBy === 'priority') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('priority')
                      setSortOrder('asc')
                    }
                  }}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                >
                  优先级 {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('name')
                      setSortOrder('asc')
                    }
                  }}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                >
                  规则名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                触发条件
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                响应类型
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => {
                    if (sortBy === 'triggers') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('triggers')
                      setSortOrder('desc')
                    }
                  }}
                  className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                >
                  触发次数 {sortBy === 'triggers' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedRules.map((rule) => (
              <tr
                key={rule.id}
                className={`
                  hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors
                  ${!rule.enabled ? 'opacity-60' : ''}
                `}
              >
                {/* 优先级 */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    {rule.priority}
                  </span>
                </td>

                {/* 规则名称 */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </span>
                    {rule.trigger.pattern && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">
                        {rule.trigger.pattern}
                      </span>
                    )}
                  </div>
                </td>

                {/* 触发条件 */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    {getTriggerLabel(rule.trigger.type)}
                  </span>
                </td>

                {/* 响应类型 */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    {getResponseLabel(rule.response.type)}
                  </span>
                </td>

                {/* 触发次数 */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {rule.stats.totalTriggers}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      今日: {rule.stats.todayTriggers}
                    </span>
                  </div>
                </td>

                {/* 状态 */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(rule)}
                    className={`
                      inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                      ${rule.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {rule.enabled ? <Power size={12} /> : <PowerOff size={12} />}
                    <span>{rule.enabled ? '启用' : '禁用'}</span>
                  </button>
                </td>

                {/* 操作 */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end space-x-2">
                    {onTest && (
                      <button
                        onClick={() => onTest(rule)}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400 transition-colors"
                        title="测试规则"
                      >
                        <PlayCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(rule)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 transition-colors"
                      title="编辑"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 transition-colors"
                      title="复制"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(rule)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
