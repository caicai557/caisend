/**
 * 账号管理 Hook
 * 统一管理账号的 CRUD 操作和对话框状态
 */

import { useState } from 'react'
import { useAccountStore } from '../store/accountStore'
import { accountService } from '../services/accountService'
import { Account, AccountStatus } from '../types/account'
import { AccountFormData } from '../components/AccountForm'

export function useAccountManager() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccountStore()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // 创建账号
  const handleCreate = async (data: AccountFormData) => {
    try {
      const newAccount: Account = {
        id: `account-${Date.now()}`,
        name: data.name,
        phone: data.phone,
        status: AccountStatus.STOPPED,
        profilePath: `./profiles/${data.name}`,
        enabled: data.enabled,
        createdAt: new Date().toISOString(),
        config: data.config,
        stats: {
          totalReplies: 0,
          todayReplies: 0,
          totalErrors: 0,
          todayErrors: 0,
          uptime: 0
        }
      }

      // 调用服务创建账号
      const created = await accountService.create({
        name: data.name,
        phone: data.phone,
        config: data.config
      })

      // 更新 store
      addAccount(created || newAccount)
      setShowCreateDialog(false)
      
      return true
    } catch (error) {
      console.error('创建账号失败:', error)
      return false
    }
  }

  // 编辑账号
  const handleEdit = async (data: AccountFormData) => {
    if (!selectedAccount) return false

    try {
      const updated = await accountService.update(selectedAccount.id, {
        name: data.name,
        phone: data.phone,
        enabled: data.enabled,
        config: data.config
      })

      updateAccount(selectedAccount.id, updated || {
        name: data.name,
        phone: data.phone,
        enabled: data.enabled,
        config: data.config
      })

      setShowEditDialog(false)
      setSelectedAccount(null)
      
      return true
    } catch (error) {
      console.error('编辑账号失败:', error)
      return false
    }
  }

  // 删除账号
  const handleDelete = async () => {
    if (!selectedAccount) return false

    try {
      await accountService.delete(selectedAccount.id)
      deleteAccount(selectedAccount.id)
      setShowDeleteDialog(false)
      setSelectedAccount(null)
      
      return true
    } catch (error) {
      console.error('删除账号失败:', error)
      return false
    }
  }

  // 打开创建对话框
  const openCreateDialog = () => {
    setShowCreateDialog(true)
  }

  // 打开编辑对话框
  const openEditDialog = (account: Account) => {
    setSelectedAccount(account)
    setShowEditDialog(true)
  }

  // 打开删除对话框
  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account)
    setShowDeleteDialog(true)
  }

  // 关闭所有对话框
  const closeDialogs = () => {
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setShowDeleteDialog(false)
    setSelectedAccount(null)
  }

  return {
    // 状态
    accounts,
    showCreateDialog,
    showEditDialog,
    showDeleteDialog,
    selectedAccount,

    // 操作
    handleCreate,
    handleEdit,
    handleDelete,

    // 对话框控制
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialogs
  }
}
