/**
 * 账号表单组件
 * 用于创建和编辑账号
 */

import { useState } from 'react'
import { Account, AccountConfig } from '../types/account'

interface AccountFormProps {
  account?: Account // 编辑模式下传入现有账号
  onSubmit: (data: AccountFormData) => void
  onCancel: () => void
}

export interface AccountFormData {
  name: string
  phone: string
  enabled: boolean
  config: AccountConfig
}

export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    name: account?.name || '',
    phone: account?.phone || '',
    enabled: account?.enabled ?? true,
    config: account?.config || {
      pollInterval: 5,
      pollIntervalRange: [3, 7],
      autoRead: true,
      readDelay: 1000,
      chats: [],
      headless: false,
      slowMo: 100,
      timeout: 30000
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '账号名称不能为空'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '手机号不能为空'
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = '手机号格式不正确'
    }

    if (formData.config.pollInterval < 1 || formData.config.pollInterval > 60) {
      newErrors.pollInterval = '轮询间隔必须在 1-60 秒之间'
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
          {/* 账号名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              账号名称 <span className="text-red-500">*</span>
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
              placeholder="例如：账号1"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`
                w-full px-4 py-2 rounded-lg border
                ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              placeholder="+86 1234567890"
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                启用账号
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                禁用后将不会自动启动
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

      {/* 运行配置 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          运行配置
        </h3>
        <div className="space-y-4">
          {/* 轮询间隔 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              轮询间隔（秒）
            </label>
            <input
              type="number"
              value={formData.config.pollInterval}
              onChange={(e) => setFormData({
                ...formData,
                config: { ...formData.config, pollInterval: Number(e.target.value) }
              })}
              min={1}
              max={60}
              className={`
                w-full px-4 py-2 rounded-lg border
                ${errors.pollInterval ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            />
            {errors.pollInterval && (
              <p className="text-xs text-red-500 mt-1">{errors.pollInterval}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              检查新消息的时间间隔
            </p>
          </div>

          {/* 自动已读 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                自动已读
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                自动将消息标记为已读
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config.autoRead}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, autoRead: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 无头模式 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                无头模式
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                后台运行，不显示浏览器窗口
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.config.headless}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, headless: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
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
          {account ? '保存' : '创建'}
        </button>
      </div>
    </form>
  )
}
