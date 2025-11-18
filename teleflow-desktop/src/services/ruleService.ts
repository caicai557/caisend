/**
 * 规则管理服务
 * 封装与规则相关的 IPC 调用
 */

import { api } from './api'
import type { Rule, RuleExecutionResult, RuleFormData, RuleTestParams } from '../types/rule'

export const ruleService = {
  /**
   * 获取账号的所有规则
   */
  async getRules(accountId: string): Promise<Rule[]> {
    const response = await api.invoke<{ rules: Rule[] }>('rule:list', { accountId })
    return response.rules || []
  },

  /**
   * 创建规则
   */
  async create(accountId: string, data: RuleFormData): Promise<Rule> {
    const response = await api.invoke<{ rule: Rule }>('rule:create', { 
      accountId,
      ...data 
    })
    return response.rule
  },

  /**
   * 更新规则
   */
  async update(ruleId: string, data: Partial<RuleFormData>): Promise<Rule> {
    const response = await api.invoke<{ rule: Rule }>('rule:update', { 
      ruleId,
      ...data 
    })
    return response.rule
  },

  /**
   * 删除规则
   */
  async delete(ruleId: string): Promise<void> {
    await api.invoke('rule:delete', { ruleId })
  },

  /**
   * 切换规则启用状态
   */
  async toggle(ruleId: string, enabled: boolean): Promise<Rule> {
    const response = await api.invoke<{ rule: Rule }>('rule:toggle', { 
      ruleId,
      enabled 
    })
    return response.rule
  },

  /**
   * 测试规则
   */
  async test(params: RuleTestParams): Promise<RuleExecutionResult> {
    const response = await api.invoke<{ result: RuleExecutionResult }>('rule:test', params)
    return response.result
  },

  /**
   * 监听规则触发事件
   */
  onRuleTriggered(callback: (result: RuleExecutionResult) => void): () => void {
    return api.on('rule:triggered', callback)
  }
}
