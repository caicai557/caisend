/**
 * 规则测试对话框
 * 用于测试规则匹配和响应
 */

import { useState } from 'react'
import { Modal } from './Modal'
import { Rule } from '../types/rule'
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react'

interface RuleTestDialogProps {
  show: boolean
  rule: Rule | null
  onClose: () => void
  onTest: (rule: Rule, message: string) => string | null
}

export function RuleTestDialog({ show, rule, onClose, onTest }: RuleTestDialogProps) {
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState<{
    matched: boolean
    response: string | null
  } | null>(null)

  const handleTest = () => {
    if (!rule || !testMessage.trim()) return

    const response = onTest(rule, testMessage)
    setTestResult({
      matched: response !== null,
      response
    })
  }

  const handleClose = () => {
    setTestMessage('')
    setTestResult(null)
    onClose()
  }

  if (!rule) return null

  return (
    <Modal show={show} onClose={handleClose} title="测试规则" size="md">
      <div className="space-y-4">
        {/* 规则信息 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {rule.name}
            </h4>
            <span className={`
              px-2 py-0.5 rounded text-xs font-medium
              ${rule.enabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }
            `}>
              {rule.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <p>触发类型: <span className="text-gray-900 dark:text-white">{rule.trigger.type}</span></p>
            {rule.trigger.pattern && (
              <p>匹配模式: <span className="text-gray-900 dark:text-white">{rule.trigger.pattern}</span></p>
            )}
            <p>响应类型: <span className="text-gray-900 dark:text-white">{rule.response.type}</span></p>
          </div>
        </div>

        {/* 测试输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            测试消息
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入要测试的消息..."
            />
            <button
              onClick={handleTest}
              disabled={!testMessage.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              测试
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={`
            p-4 rounded-lg border-2
            ${testResult.matched
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }
          `}>
            <div className="flex items-start space-x-3">
              {testResult.matched ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <h5 className={`text-sm font-semibold mb-1 ${
                  testResult.matched
                    ? 'text-green-900 dark:text-green-300'
                    : 'text-red-900 dark:text-red-300'
                }`}>
                  {testResult.matched ? '规则匹配成功' : '规则未匹配'}
                </h5>
                {testResult.matched && testResult.response && (
                  <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-start space-x-2">
                      <MessageSquare size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">机器人回复:</p>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {testResult.response}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!testResult.matched && (
                  <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                    消息未触发此规则，请检查触发条件是否正确
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 提示：测试功能仅验证规则匹配和响应内容，不会实际发送消息
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </Modal>
  )
}
