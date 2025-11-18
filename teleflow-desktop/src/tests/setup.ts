import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, vi } from 'vitest'

import type { ElectronAPI } from '../types/app'

// 扩展 expect 匹配器
expect.extend(matchers)

// 每个测试后清理
afterEach(() => {
  cleanup()
})

const baseElectron = (globalThis.window?.electron ?? {}) as Partial<ElectronAPI>

const createFn = <T extends (...args: unknown[]) => unknown>(fn?: T): T =>
  (fn ?? (vi.fn() as unknown as T))

const createSubscription = <T extends (...args: unknown[]) => () => void>(fn?: T): T =>
  (fn ?? (vi.fn(() => vi.fn()) as unknown as T))

// Mock Electron API，优先复用已有实现
const electronMock: ElectronAPI = {
  getConfig: createFn(baseElectron.getConfig),
  saveConfig: createFn(baseElectron.saveConfig),
  validateConfig: createFn(baseElectron.validateConfig),
  startAccount: createFn(baseElectron.startAccount),
  stopAccount: createFn(baseElectron.stopAccount),
  getAccountStatus: createFn(baseElectron.getAccountStatus),
  invoke: createFn(baseElectron.invoke),
  on: createFn(baseElectron.on),
  removeListener: createFn(baseElectron.removeListener),
  send: createFn(baseElectron.send),
  onLogUpdate: createSubscription(baseElectron.onLogUpdate),
  onAccountStatusChanged: createSubscription(baseElectron.onAccountStatusChanged),
  onQrCode: createSubscription(baseElectron.onQrCode),
  onLoginSuccess: createSubscription(baseElectron.onLoginSuccess)
}

const globalWindow = globalThis.window ?? ({} as Window)
globalWindow.electron = electronMock
globalThis.window = globalWindow
