/// <reference types="vite/client" />

// 导入完整的类型定义
import type { ElectronAPI } from './types/app'

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}
