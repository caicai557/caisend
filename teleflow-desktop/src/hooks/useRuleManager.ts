/**
 * 规则管理 Hook
 * 统一管理规则的 CRUD 操作和对话框状态
 */

import { useState } from 'react'
import { Rule, RuleFormData, ResponseType } from '../types/rule'

export function useRuleManager() {
  const [rules, setRules] = useState<Rule[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  // 创建规则
  const handleCreate = async (data: RuleFormData) => {
    try {
      const newRule: Rule = {
        id: `rule-${Date.now()}`,
        ...data,
        stats: {
          totalTriggers: 0,
          todayTriggers: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setRules([...rules, newRule])
      setShowCreateDialog(false)
      
      return true
    } catch (error) {
      console.error('创建规则失败:', error)
      return false
    }
  }

  // 编辑规则
  const handleEdit = async (data: RuleFormData) => {
    if (!selectedRule) return false

    try {
      const updatedRule: Rule = {
        ...selectedRule,
        ...data,
        updatedAt: new Date().toISOString()
      }

      setRules(rules.map(r => r.id === selectedRule.id ? updatedRule : r))
      setShowEditDialog(false)
      setSelectedRule(null)
      
      return true
    } catch (error) {
      console.error('编辑规则失败:', error)
      return false
    }
  }

  // 删除规则
  const handleDelete = async () => {
    if (!selectedRule) return false

    try {
      setRules(rules.filter(r => r.id !== selectedRule.id))
      setShowDeleteDialog(false)
      setSelectedRule(null)
      
      return true
    } catch (error) {
      console.error('删除规则失败:', error)
      return false
    }
  }

  // 切换启用状态
  const handleToggle = async (rule: Rule) => {
    try {
      const updatedRule = {
        ...rule,
        enabled: !rule.enabled,
        updatedAt: new Date().toISOString()
      }
      
      setRules(rules.map(r => r.id === rule.id ? updatedRule : r))
      return true
    } catch (error) {
      console.error('切换规则状态失败:', error)
      return false
    }
  }

  // 测试规则
  const handleTest = (rule: Rule, testMessage: string): string | null => {
    try {
      // 简单的匹配测试逻辑
      const { trigger, response } = rule

      if (trigger.type === 'keyword' && trigger.pattern) {
        const pattern = trigger.pattern.toLowerCase()
        const message = testMessage.toLowerCase()
        
        switch (trigger.matchMode) {
          case 'exact':
            if (message !== pattern) return null
            break
          case 'contains':
            if (!message.includes(pattern)) return null
            break
          case 'starts':
            if (!message.startsWith(pattern)) return null
            break
          case 'ends':
            if (!message.endsWith(pattern)) return null
            break
        }
      } else if (trigger.type === 'regex' && trigger.pattern) {
        const regex = new RegExp(trigger.pattern, trigger.caseSensitive ? '' : 'i')
        if (!regex.test(testMessage)) return null
      }

      // 返回响应内容
      if (response.type === ResponseType.TEXT && response.content) {
        // 简单的变量替换
        return response.content
          .replace(/\{sender\}/g, '测试用户')
          .replace(/\{message\}/g, testMessage)
          .replace(/\{time\}/g, new Date().toLocaleTimeString('zh-CN'))
      }

      return '规则匹配成功'
    } catch (error) {
      console.error('测试规则失败:', error)
      return null
    }
  }

  // 打开创建对话框
  const openCreateDialog = () => {
    setShowCreateDialog(true)
  }

  // 打开编辑对话框
  const openEditDialog = (rule: Rule) => {
    setSelectedRule(rule)
    setShowEditDialog(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (rule: Rule) => {
    setSelectedRule(rule)
    setShowDeleteDialog(true)
  }

  // 打开测试对话框
  const openTestDialog = (rule: Rule) => {
    setSelectedRule(rule)
    setShowTestDialog(true)
  }

  // 关闭所有对话框
  const closeDialogs = () => {
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setShowDeleteDialog(false)
    setShowTestDialog(false)
    setSelectedRule(null)
  }

  return {
    // 状态
    rules,
    showCreateDialog,
    showEditDialog,
    showDeleteDialog,
    showTestDialog,
    selectedRule,

    // 操作
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggle,
    handleTest,

    // 对话框控制
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    openTestDialog,
    closeDialogs
  }
}
