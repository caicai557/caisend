/**
 * 应用全局状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ActivityEntry, DashboardMetrics, SystemConfig } from '../types/config'

type ViewType = 'dashboard' | 'account' | 'logs' | 'settings'

interface AppStore {
  // UI 状态
  currentView: ViewType
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  
  // 系统配置
  systemConfig: SystemConfig | null
  
  // 仪表盘数据
  metrics: DashboardMetrics
  activities: ActivityEntry[]
  
  // 状态提示
  statusMessage: string
  
  // Actions
  setView: (view: ViewType) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setSystemConfig: (config: SystemConfig) => void
  setMetrics: (metrics: DashboardMetrics) => void
  addActivity: (activity: ActivityEntry) => void
  setStatusMessage: (message: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // 初始状态
      currentView: 'dashboard',
      sidebarCollapsed: false,
      theme: 'dark',
      systemConfig: null,
      metrics: {
        totalAccounts: 0,
        runningAccounts: 0,
        todayReplies: 0,
        todayErrors: 0,
        systemUptime: 0
      },
      activities: [],
      statusMessage: '系统就绪',

      // Actions
      setView: (view) => set({ currentView: view }),
      
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),
      
      setTheme: (theme) => {
        set({ theme })
        // 应用主题到 document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      
      setSystemConfig: (config) => set({ systemConfig: config }),
      
      setMetrics: (metrics) => set({ metrics }),
      
      addActivity: (activity) => set((state) => ({
        activities: [activity, ...state.activities].slice(0, 50) // 只保留最近50条
      })),
      
      setStatusMessage: (message) => set({ statusMessage: message })
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
)
