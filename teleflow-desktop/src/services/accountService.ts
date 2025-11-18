/**
 * 账号管理服务
 */

import { api } from './api'
import type { Account, AccountStats, CreateAccountRequest } from '../types/account'

class AccountService {
  /**
   * 获取账号列表
   */
  async list(): Promise<Account[]> {
    return api.invoke('account:list')
  }

  /**
   * 获取账号详情
   */
  async get(id: string): Promise<Account> {
    return api.invoke('account:get', { id })
  }

  /**
   * 创建账号
   */
  async create(data: CreateAccountRequest): Promise<Account> {
    return api.invoke('account:create', data)
  }

  /**
   * 更新账号
   */
  async update(id: string, data: Partial<Account>): Promise<Account> {
    return api.invoke('account:update', { id, data })
  }

  /**
   * 删除账号
   */
  async delete(id: string): Promise<void> {
    return api.invoke('account:delete', { id })
  }

  /**
   * 启动账号
   */
  async start(id: string): Promise<void> {
    return api.invoke('account:start', { id })
  }

  /**
   * 停止账号
   */
  async stop(id: string): Promise<void> {
    return api.invoke('account:stop', { id })
  }

  /**
   * 获取账号统计信息
   */
  async getStats(id: string): Promise<AccountStats> {
    return api.invoke('account:stats', { id })
  }

  /**
   * 监听账号状态变化
   */
  onStatusChange(callback: (data: { id: string; status: string }) => void): () => void {
    return api.on('account:status-changed', callback)
  }
}

export const accountService = new AccountService()
