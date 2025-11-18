/**
 * 配置管理服务
 */

import { api } from './api'
import type { SystemConfig } from '../types/config'

class ConfigService {
  /**
   * 获取系统配置
   */
  async get(): Promise<SystemConfig> {
    return api.invoke('config:get')
  }

  /**
   * 更新系统配置
   */
  async update(config: Partial<SystemConfig>): Promise<SystemConfig> {
    return api.invoke('config:update', config)
  }

  /**
   * 重置配置
   */
  async reset(): Promise<SystemConfig> {
    return api.invoke('config:reset')
  }

  /**
   * 打开路径
   */
  async openPath(type: 'logs' | 'config' | 'profiles'): Promise<void> {
    if (window.electron?.openPath) {
      return window.electron.openPath(type)
    }
  }
}

export const configService = new ConfigService()
