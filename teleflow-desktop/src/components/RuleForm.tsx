/**
 * 规则表单组件
 * 用于创建和编辑自动回复规则
 */

import { useState } from 'react'
import { Rule, TriggerType, ResponseType, MatchMode, RuleFormData } from '../types/rule'
import { Info } from 'lucide-react'

interface RuleFormProps {
  rule?: Rule
  onSubmit: (data: RuleFormData) => void
  onCancel: () => void
}

export function RuleForm({ rule, onSubmit, onCancel }: RuleFormProps) {
  const [formData, setFormData] = useState<RuleFormData>({
    name: rule?.name || '',
    enabled: rule?.enabled ?? true,
    priority: rule?.priority || 0,
    trigger: rule?.trigger || {
      type: TriggerType.KEYWORD,
      pattern: '',
      matchMode: MatchMode.CONTAINS,
      caseSensitive: false
    },
    response: rule?.response || {
      type: ResponseType.TEXT,
      content: '',
      delay: 0
    },
    limits: rule?.limits || {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '规则名称不能为空'
    }

    if (formData.trigger.type === TriggerType.KEYWORD && !formData.trigger.pattern?.trim()) {
      newErrors.pattern = '关键词不能为空'
    }

    if (formData.trigger.type === TriggerType.REGEX) {
      try {
        new RegExp(formData.trigger.pattern || '')
      } catch {
        newErrors.pattern = '正则表达式格式不正确'
      }
    }

    if (formData.response.type === ResponseType.TEXT && !formData.response.content?.trim()) {
      newErrors.content = '回复内容不能为空'
    }

    if (formData.priority < 0 || formData.priority > 999) {
      newErrors.priority = '优先级必须在 0-999 之间'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          基本信息
        </h3>
        <div className="space-y-4">
          {/* 规则名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              规则名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`
                w-full px-4 py-2 rounded-lg border
                ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              placeholder="例如：自动问候"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              优先级（0-999）
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              min={0}
              max={999}
              className={`
                w-full px-4 py-2 rounded-lg border
                ${errors.priority ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            {errors.priority && (
              <p className="text-xs text-red-500 mt-1">{errors.priority}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              数字越小优先级越高，0 为最高优先级
            </p>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                启用规则
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                禁用后规则将不会触发
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 触发条件 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          触发条件
        </h3>
        <div className="space-y-4">
          {/* 触发类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              触发类型
            </label>
            <select
              value={formData.trigger.type}
              onChange={(e) => setFormData({
                ...formData,
                trigger: { ...formData.trigger, type: e.target.value as TriggerType }
              })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={TriggerType.KEYWORD}>关键词匹配</option>
              <option value={TriggerType.REGEX}>正则表达式</option>
              <option value={TriggerType.ALL}>全部消息</option>
              <option value={TriggerType.MENTION}>@提及</option>
              <option value={TriggerType.PRIVATE}>私聊消息</option>
              <option value={TriggerType.GROUP}>群聊消息</option>
            </select>
          </div>

          {/* 关键词/正则 */}
          {(formData.trigger.type === TriggerType.KEYWORD || formData.trigger.type === TriggerType.REGEX) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.trigger.type === TriggerType.KEYWORD ? '关键词' : '正则表达式'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.trigger.pattern || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger: { ...formData.trigger, pattern: e.target.value }
                  })}
                  className={`
                    w-full px-4 py-2 rounded-lg border
                    ${errors.pattern ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    bg-white dark:bg-gray-700
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                  placeholder={formData.trigger.type === TriggerType.KEYWORD ? '例如：你好' : '例如：^\\d+$'}
                />
                {errors.pattern && (
                  <p className="text-xs text-red-500 mt-1">{errors.pattern}</p>
                )}
              </div>

              {/* 匹配模式（仅关键词）*/}
              {formData.trigger.type === TriggerType.KEYWORD && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    匹配模式
                  </label>
                  <select
                    value={formData.trigger.matchMode}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, matchMode: e.target.value as MatchMode }
                    })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={MatchMode.CONTAINS}>包含</option>
                    <option value={MatchMode.EXACT}>精确匹配</option>
                    <option value={MatchMode.STARTS_WITH}>开头匹配</option>
                    <option value={MatchMode.ENDS_WITH}>结尾匹配</option>
                  </select>
                </div>
              )}

              {/* 大小写敏感 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    大小写敏感
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trigger.caseSensitive || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      trigger: { ...formData.trigger, caseSensitive: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 响应动作 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          响应动作
        </h3>
        <div className="space-y-4">
          {/* 响应类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              响应类型
            </label>
            <select
              value={formData.response.type}
              onChange={(e) => setFormData({
                ...formData,
                response: { ...formData.response, type: e.target.value as ResponseType }
              })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={ResponseType.TEXT}>文本回复</option>
              <option value={ResponseType.IMAGE}>图片回复</option>
              <option value={ResponseType.FILE}>文件回复</option>
              <option value={ResponseType.IGNORE}>忽略消息</option>
            </select>
          </div>

          {/* 回复内容 */}
          {formData.response.type === ResponseType.TEXT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                回复内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.response.content || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  response: { ...formData.response, content: e.target.value }
                })}
                rows={4}
                className={`
                  w-full px-4 py-2 rounded-lg border
                  ${errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  bg-white dark:bg-gray-700
                  text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  resize-none
                `}
                placeholder="输入回复内容，支持变量：{{sender}}、{{message}}、{{time}}"
              />
              {errors.content && (
                <p className="text-xs text-red-500 mt-1">{errors.content}</p>
              )}
              <div className="flex items-start space-x-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Info size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  支持变量：{'{'}sender{'}'} = 发送者，{'{'}message{'}'} = 消息内容，{'{'}time{'}'} = 当前时间
                </p>
              </div>
            </div>
          )}

          {/* 延迟回复 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              延迟回复（毫秒）
            </label>
            <input
              type="number"
              value={formData.response.delay || 0}
              onChange={(e) => setFormData({
                ...formData,
                response: { ...formData.response, delay: Number(e.target.value) }
              })}
              min={0}
              max={60000}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0 表示立即回复，建议设置 500-3000ms 更自然
            </p>
          </div>
        </div>
      </div>

      {/* 限制条件 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          限制条件（可选）
        </h3>
        <div className="space-y-4">
          {/* 每日最大次数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              每日最大触发次数
            </label>
            <input
              type="number"
              value={formData.limits?.maxPerDay || ''}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, maxPerDay: e.target.value ? Number(e.target.value) : undefined }
              })}
              min={1}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="不限制"
            />
          </div>

          {/* 冷却时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              冷却时间（秒）
            </label>
            <input
              type="number"
              value={formData.limits?.cooldown || ''}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, cooldown: e.target.value ? Number(e.target.value) : undefined }
              })}
              min={0}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="不限制"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              两次触发之间的最小间隔时间
            </p>
          </div>
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {rule ? '保存' : '创建'}
        </button>
      </div>
    </form>
  )
}
