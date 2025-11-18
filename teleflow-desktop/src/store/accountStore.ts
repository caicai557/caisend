/**
 * 账号状态管理
 * 使用 Zustand 管理账号相关状态
 */

import { create } from 'zustand'

import type { Account } from '../types/account'

interface AccountStore {
  // 状态
  accounts: Account[]
  selectedAccountId: string | null
  loading: boolean
  error: string | null

  // Actions
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  deleteAccount: (id: string) => void
  selectAccount: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  getAccountById: (id: string) => Account | undefined
  getRunningAccounts: () => Account[]
  getEnabledAccounts: () => Account[]
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  // 初始状态
  accounts: [],
  selectedAccountId: null,
  loading: false,
  error: null,

  // Actions
  setAccounts: (accounts) => set({ accounts }),
  
  addAccount: (account) => set((state) => ({
    accounts: [...state.accounts, account]
  })),
  
  updateAccount: (id, data) => set((state) => ({
    accounts: state.accounts.map(account =>
      account.id === id ? { ...account, ...data } : account
    )
  })),
  
  deleteAccount: (id) => set((state) => ({
    accounts: state.accounts.filter(account => account.id !== id),
    selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId
  })),
  
  selectAccount: (id) => set({ selectedAccountId: id }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Computed
  getAccountById: (id) => {
    return get().accounts.find(account => account.id === id)
  },
  
  getRunningAccounts: () => {
    return get().accounts.filter(account => account.status === 'running')
  },
  
  getEnabledAccounts: () => {
    return get().accounts.filter(account => account.enabled)
  }
}))
