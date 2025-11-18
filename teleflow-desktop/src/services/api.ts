/**
 * API 抽象层
 * 统一处理与 Electron 主进程的 IPC 通信
 */

import type { IPCResponse } from '../types/ipc'

class API {
  /**
   * 调用 IPC 方法
   */
  async invoke<T = unknown, P = unknown>(channel: string, data?: P): Promise<T> {
    try {
      const response = await window.electron.invoke<IPCResponse<T>>(channel, data)
      
      if (!response.success) {
        throw new Error(response.error?.message || '未知错误')
      }
      
      return response.data as T
    } catch (error) {
      console.error(`[API] 调用 ${channel} 失败:`, error)
      throw error
    }
  }

  /**
   * 监听 IPC 事件
   */
  on<T = unknown>(channel: string, callback: (data: T) => void): () => void {
    window.electron.on(channel, callback)
    
    // 返回取消监听的函数
    return () => {
      window.electron.removeListener(channel, callback)
    }
  }

  /**
   * 发送 IPC 消息（不等待响应）
   */
  send<T = unknown>(channel: string, data?: T): void {
    window.electron.send(channel, data)
  }
}

export const api = new API()
