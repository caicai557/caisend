/**
 * 系统设置视图
 * 显示全局设置选项
 */

import { Moon, Sun, Globe } from 'lucide-react'

import { useAppStore } from '../../store/appStore'

export function SettingsView() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  const themeOptions = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
  ] as const

  return (
    <div className="p-6 h-full overflow-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">系统设置</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          配置系统参数和偏好设置
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* 外观设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            外观设置
          </h2>

          <div className="space-y-4">
            {/* 主题选择 */}
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主题模式
              </p>
              <div className="grid grid-cols-2 gap-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`
                        flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-colors
                        ${theme === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      <Icon size={20} className={theme === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} />
                      <span className={`text-sm font-medium ${theme === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 常规设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            常规设置
          </h2>

          <div className="space-y-4">
            {/* 语言设置 */}
            <div>
              <label htmlFor="settings-language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe size={16} className="inline mr-2" />
                界面语言
              </label>
              <select
                id="settings-language"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {/* 日志保留天数 */}
            <div>
              <label htmlFor="log-retention-days" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                日志保留天数
              </label>
              <input
                type="number"
                id="log-retention-days"
                defaultValue={30}
                min={1}
                max={365}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                超过此天数的日志将被自动清理
              </p>
            </div>
          </div>
        </div>

        {/* Playwright 设置 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Playwright 配置
          </h2>

          <div className="space-y-4">
            {/* 无头模式 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">无头模式</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  启用后浏览器将在后台运行，不显示窗口
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <span className="sr-only">切换无头模式</span>
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 超时时间 */}
            <div>
              <label htmlFor="playwright-timeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                超时时间（秒）
              </label>
              <input
                type="number"
                id="playwright-timeout"
                defaultValue={30}
                min={5}
                max={300}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end space-x-3">
          <button className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors">
            重置
          </button>
          <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
