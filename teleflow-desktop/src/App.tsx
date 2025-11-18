import { useState, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { useTheme } from './hooks/useTheme'
import { useNotifications, NotificationContainer } from './components/Notification'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import TelegramLoginDialog from './components/TelegramLoginDialog'
import HeroStats from './components/HeroStats'
import AccountCard from './components/AccountCard'
import type { 
  SimpleAccount, 
  AccountRuntimeStatus, 
  LoginDialogState,
  LogEntry,
  AccountStatusChangeEvent,
  QrCodeEvent,
  IPCResponse
} from './types/app'

function App() {
  const [accounts, setAccounts] = useState<SimpleAccount[]>([])
  const [logs, setLogs] = useState<string[]>([])
  // stats 已改为实时计算，不再需要维护独立状态
  const [showSettings, setShowSettings] = useState(false)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [tempAccountName, setTempAccountName] = useState('')
  const [accountStatus, setAccountStatus] = useState<Record<string, AccountRuntimeStatus>>({})
  const [loginDialog, setLoginDialog] = useState<LoginDialogState>({
    show: false,
    account: '',
    method: 'qr',
    step: 'phone',
    countdown: 120,
    resendCountdown: 0,
    codeSent: false,
    countryCode: '+86',
    otpMethod: 'sms'
  })
  
  const { actualTheme, toggleTheme } = useTheme()
  const { notifications, removeNotification, success, error, info } = useNotifications()
  const normalizedPhoneNumber = (loginDialog.phoneNumber ?? '').replace(/\s/g, '')
  const normalizedVerificationCode = loginDialog.verificationCode ?? ''

  // QR 码倒计时定时器
  useEffect(() => {
    if (!loginDialog.show || loginDialog.method !== 'qr' || (loginDialog.countdown ?? 0) <= 0) return
    
    const timer = setInterval(() => {
      setLoginDialog(prev => {
        if ((prev.countdown ?? 0) <= 1) {
          // 倒计时结束，刷新 QR 码
          info('QR 码已过期', '正在刷新二维码...')
          return { ...prev, countdown: 120 }
        }
        return { ...prev, countdown: (prev.countdown ?? 0) - 1 }
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [loginDialog.show, loginDialog.method, loginDialog.countdown])

  // 重新发送验证码倒计时
  useEffect(() => {
    if (!loginDialog.show || loginDialog.method !== 'phone' || loginDialog.resendCountdown <= 0) return
    
    const timer = setInterval(() => {
      setLoginDialog(prev => {
        if (prev.resendCountdown <= 1) {
          return { ...prev, resendCountdown: 0 }
        }
        return { ...prev, resendCountdown: prev.resendCountdown - 1 }
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [loginDialog.show, loginDialog.method, loginDialog.resendCountdown])

  useEffect(() => {
    // 先加载配置，然后在加载完成后检查 session
    loadConfig().then(() => {
      // 配置加载完成后才检查 session
      checkAllAccountSessions()
    })
    
    // 仅在 Electron 环境中监听日志
    if (typeof window !== 'undefined' && window.electron && window.electron.onLogUpdate) {
      try {
        const cleanup = window.electron.onLogUpdate((log: LogEntry) => {
          setLogs(prev => [...prev.slice(-100), `[${log.account}] ${log.message}`])
          
          // 解析日志中的状态信息
          if (log.message.includes('QR code ready') || log.message.startsWith('data:image')) {
            // QR 码就绪（假设后端推送 Base64 图片）
            const qrCode = log.message.startsWith('data:image') ? log.message : undefined
            setAccountStatus(prev => ({
              ...prev,
              [log.account]: { ...prev[log.account], needsLogin: true, qrCode }
            }))
            // 同时更新登录对话框
            setLoginDialog(prev => prev.account === log.account ? { ...prev, qrCode } : prev)
          } else if (log.message.includes('登录成功') || log.message.includes('Logged in successfully')) {
            // 明确的登录成功消息 - 只有真正登录成功才移除未登录标签
            setAccountStatus(prev => ({
              ...prev,
              [log.account]: { ...prev[log.account], online: true, needsLogin: false }
            }))
            // 关闭登录对话框
            setLoginDialog(prev => prev.account === log.account ? { ...prev, show: false } : prev)
            success('登录成功', `账号 ${log.account} 已成功登录`)
          } else if (log.message.includes('Session loaded')) {
            // Session 加载 ≠ 登录成功，保持未登录状态直到明确确认
            console.log(`[${log.account}] Session loaded, but login status not confirmed`)
          } else if (log.message.includes('未读') && log.message.match(/\d+/)) {
            // 未读数更新
            const count = parseInt(log.message.match(/\d+/)?.[0] || '0')
            setAccountStatus(prev => ({
              ...prev,
              [log.account]: { ...prev[log.account], unreadCount: count }
            }))
          }
        })
        return cleanup
      } catch (err) {
        console.warn('Failed to setup log listener:', err)
      }
    }
    
    // 仅在 Electron 环境中监听账号状态
    if (typeof window !== 'undefined' && window.electron && window.electron.onAccountStatusChanged) {
      try {
        const cleanup = window.electron.onAccountStatusChanged((status: AccountStatusChangeEvent) => {
          setAccountStatus(prev => ({
            ...prev,
            [status.account]: {
              online: status.online || false,
              unreadCount: status.unreadCount || 0,
              chatCount: status.chatCount || 0,
              needsLogin: status.needsLogin || false,
              qrCode: status.qrCode
            }
          }))
        })
        return cleanup
      } catch (err) {
        console.warn('Failed to setup status listener:', err)
      }
    }
    
    // 监听 QR 码事件
    if (typeof window !== 'undefined' && window.electron && window.electron.onQrCode) {
      try {
        const cleanup = window.electron.onQrCode((data: QrCodeEvent) => {
          console.log('[QR Code] 收到 QR 码:', data.accountName)
          
          // 更新账号状态
          setAccountStatus(prev => ({
            ...prev,
            [data.accountName]: {
              ...prev[data.accountName],
              qrCode: data.qrCode,
              needsLogin: true
            }
          }))
          
          // 如果当前登录对话框显示的是这个账号，更新 QR 码
          setLoginDialog(prev => {
            if (prev.account === data.accountName) {
              return { ...prev, qrCode: data.qrCode }
            }
            return prev
          })
          
          info('二维码已生成', `请扫描二维码登录账号 ${data.accountName}`)
        })
        return cleanup
      } catch (err) {
        console.warn('Failed to setup QR code listener:', err)
      }
    }
  }, [])

  const loadConfig = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.electron) {
      // 浏览器环境，使用模拟数据
      const mockAccounts: SimpleAccount[] = [
        {
          name: 'account1',
          phone: '+1234567890',
          proxy: null,
          monitor_chats: ['chat1', 'chat2'],
          forward_rules: []
        }
      ]
      setAccounts(mockAccounts)
      
      // 添加模拟日志
      const demoLogs: string[] = [
        '[demo-account] 系统初始化完成',
        '[demo-account] 正在连接 Telegram Web...',
        '[demo-account] 已加载 2 条规则',
        '[demo-account] 监控 2 个聊天: Saved Messages, Support',
        '[demo-account] 系统就绪，等待消息...'
      ]
      
      demoLogs.forEach((log, index) => {
        setTimeout(() => {
          setLogs(prev => [...prev, log])
        }, (index + 1) * 500)
      })
      
      return
    }
    
    try {
      const result = await window.electron.getConfig()
      if (result.success && result.config?.accounts) {
        setAccounts(result.config.accounts)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const checkAllAccountSessions = async () => {
    // Session 预检 - 启动时检查所有账号的登录状态
    if (typeof window === 'undefined' || !window.electron) return
    
    accounts.forEach(async (account) => {
      // 这里可以调用后端 API 检查 Session 是否存在
      // const sessionPath = `./browser_data/${account.name}`
      // TODO: 调用 window.electron.checkSession(sessionPath)
      // 暂时模拟
      const hasSession = Math.random() > 0.5
      setAccountStatus(prev => ({
        ...prev,
        [account.name]: {
          ...prev[account.name],
          needsLogin: !hasSession,
          online: false,
          unreadCount: 0,
          chatCount: account.monitor_chats?.length || 0
        }
      }))
    })
  }

  const handleStart = async (accountName: string) => {
    if (typeof window === 'undefined' || !window.electron || !window.electron.startAccount) {
      info('提示', '此功能仅在 Electron 环境中可用')
      return
    }
    
    const needsLogin = !accountStatus[accountName] || accountStatus[accountName]?.needsLogin !== false
    
    console.log('[handleStart]', { accountName, needsLogin, accountStatus: accountStatus[accountName] })
    
    if (needsLogin) {
      // 需要登录，打开登录对话框
      console.log('[handleStart] 打开登录对话框')
      setLoginDialog({
        show: true,
        account: accountName,
        method: 'qr',
        step: 'phone',
        countdown: 120,
        resendCountdown: 0,
        codeSent: false,
        countryCode: '+86',
        otpMethod: 'sms'
      })
      
      // 启动 Playwright 进程，等待 QR 码
      info('启动中', `正在启动 Playwright 浏览器...`)
      const result = await window.electron.invoke<IPCResponse>('account:start', { accountId: accountName })
      if (!result.success) {
        error('启动失败', result.error || '未知错误')
        setLoginDialog({ 
          show: false, 
          account: '', 
          method: 'qr',
          step: 'phone',
          countdown: 120,
          resendCountdown: 0,
          codeSent: false,
          countryCode: '+86',
          otpMethod: 'sms'
        })
      }
    } else {
      // 已登录（needsLogin === false），直接启动
      try {
        info('启动中', `正在启动 Playwright 浏览器...`)
        const result = await window.electron.invoke<IPCResponse>('account:start', { accountId: accountName })
        if (result.success) {
          // 注意：即使启动成功，也不修改 needsLogin 状态
          // 只有收到明确的登录成功消息才会更新
          success('启动成功', `账号 ${accountName} 已成功启动${result.pid ? ` (PID: ${result.pid})` : ''}`)
        } else {
          error('启动失败', result.error || '未知错误')
        }
      } catch (err: unknown) {
        console.error('Failed to start account:', err)
        error('启动失败', err instanceof Error ? err.message : `账号 ${accountName} 启动失败`)
      }
    }
  }

  const handleStop = async (accountName: string) => {
    if (typeof window === 'undefined' || !window.electron || !window.electron.stopAccount) {
      info('提示', '此功能仅在 Electron 环境中可用')
      return
    }
    try {
      info('停止中', `正在停止账号 ${accountName}...`)
      const result = await window.electron.stopAccount(accountName)
      if (result.success) {
        success('停止成功', `账号 ${accountName} 已停止运行`)
      } else {
        error('停止失败', result.error || '未知错误')
      }
    } catch (err: unknown) {
      console.error('Failed to stop account:', err)
      error('停止失败', err?.message || `账号 ${accountName} 停止失败，请查看控制台`)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
    info('日志清空', '已清空所有日志')
  }

  const handleExportLogs = () => {
    const logsText = logs.join('\n')
    const blob = new Blob([logsText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teleflow-logs-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    success('导出成功', '日志已导出到下载文件夹')
  }

  const handleAddAccount = () => {
    // 检查是否已经有未保存的新账号
    const hasNewAccount = accounts.some(acc => acc.name === '__new__')
    if (hasNewAccount) {
      info('提示', '请先保存或取消当前编辑的账号')
      return
    }
    
    // 创建一个新的编辑中的账号卡片
    const newAccount: SimpleAccount = {
      name: '__new__',  // 临时标识
      monitor_chats: [],
      rules: [],
      isNew: true  // 标记为新建
    }
    setAccounts(prev => [...prev, newAccount])
    setEditingAccount('__new__')
    setTempAccountName('')
    info('新建账号', '请输入账号名称')
  }

  const handleSaveAccount = async (oldName: string) => {
    if (!tempAccountName.trim()) {
      error('验证失败', '请输入账号名称')
      return
    }

    const targetAccount = accounts.find(acc => acc.name === oldName)
    if (!targetAccount) {
      error('保存失败', '未找到对应账号，可能已被删除或更新，请刷新后重试')
      return
    }

    const updatedAccount: SimpleAccount = {
      ...targetAccount,
      name: tempAccountName.trim(),
      isNew: undefined
    }

    try {
      // 在浏览器环境下，直接保存到本地状态
      if (typeof window === 'undefined' || !window.electron || !window.electron.saveConfig) {
        setAccounts(prev => {
          const accountIndex = prev.findIndex(acc => acc.name === oldName)
          if (accountIndex === -1) return prev
          const newAccounts = [...prev]
          newAccounts[accountIndex] = updatedAccount
          return newAccounts
        })
        
        // 初始化新账号的状态（需要登录）
        if (oldName === '__new__') {
          setAccountStatus(prev => ({
            ...prev,
            [updatedAccount.name]: {
              online: false,
              unreadCount: 0,
              chatCount: updatedAccount.monitor_chats?.length || 0,
              needsLogin: true  // 新账号默认需要登录
            }
          }))
        }
        
        success('保存成功', `账号 ${updatedAccount.name} 已保存（仅本地）`)
        setEditingAccount(null)
        setTempAccountName('')
        return
      }

      // Electron 环境下，保存到配置文件
      const currentConfig = await window.electron.getConfig()
      if (currentConfig.success && currentConfig.config) {
        if (oldName === '__new__') {
          // 新建账号
          currentConfig.config.accounts.push(updatedAccount)
        } else {
          // 更新现有账号
          const idx = currentConfig.config.accounts.findIndex((a: SimpleAccount) => a.name === oldName)
          if (idx !== -1) {
            currentConfig.config.accounts[idx] = updatedAccount
          }
        }
        
        const result = window.electron.saveConfig ? await window.electron.saveConfig(currentConfig.config) : { success: false, error: 'saveConfig not available' }
        if (result.success) {
          setAccounts(prev => {
            if (oldName === '__new__') {
              return prev.concat(updatedAccount)
            }

            const idx = prev.findIndex(acc => acc.name === oldName)
            if (idx === -1) return prev

            const newAccounts = [...prev]
            newAccounts[idx] = updatedAccount
            return newAccounts
          })
          
          // 初始化新账号的状态（需要登录）
          if (oldName === '__new__') {
            setAccountStatus(prev => ({
              ...prev,
              [updatedAccount.name]: {
                online: false,
                unreadCount: 0,
                chatCount: updatedAccount.monitor_chats?.length || 0,
                needsLogin: true  // 新账号默认需要登录
              }
            }))
          }
          
          success('保存成功', `账号 ${updatedAccount.name} 已保存`)
          setEditingAccount(null)
          setTempAccountName('')
        } else {
          error('保存失败', result.error || '未知错误')
        }
      }
    } catch (err: unknown) {
      console.error('Failed to save account:', err)
      error('保存失败', err?.message || '请检查配置文件')
    }
  }

  const handleCancelEdit = (accountName: string) => {
    if (accountName === '__new__') {
      // 取消新建，移除卡片
      setAccounts(prev => prev.filter(acc => acc.name !== '__new__'))
    }
    setEditingAccount(null)
    setTempAccountName('')
  }

  const handleDeleteAccount = async (accountName: string) => {
    // 确认删除
    if (!window.confirm(`确定要删除账号 "${accountName}" 吗？\n\n此操作不可恢复！`)) {
      return
    }

    if (typeof window === 'undefined' || !window.electron) {
      // 浏览器环境，只删除本地状态
      setAccounts(prev => prev.filter(acc => acc.name !== accountName))
      setAccountStatus(prev => {
        const newStatus = { ...prev }
        delete newStatus[accountName]
        return newStatus
      })
      setEditingAccount(null)
      success('删除成功', `账号 ${accountName} 已删除`)
      return
    }

    try {
      // 1. 先停止账号进程
      await window.electron.stopAccount(accountName)

      // 2. 从配置中删除账号
      const result = await window.electron.getConfig()
      if (result.success && result.config) {
        const updatedConfig = {
          ...result.config,
          accounts: result.config.accounts.filter((acc: SimpleAccount) => acc.name !== accountName)
        }
        const saveResult = window.electron.saveConfig ? await window.electron.saveConfig(updatedConfig) : { success: false, error: 'saveConfig not available' }
        
        if (saveResult.success) {
          // 3. 更新前端状态
          setAccounts(prev => prev.filter(acc => acc.name !== accountName))
          setAccountStatus(prev => {
            const newStatus = { ...prev }
            delete newStatus[accountName]
            return newStatus
          })
          setEditingAccount(null)
          success('删除成功', `账号 ${accountName} 已删除`)
        } else {
          error('删除失败', saveResult.error || '保存配置失败')
        }
      }
    } catch (err) {
      console.error('删除账号失败:', err)
      error('删除失败', '删除账号时发生错误')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 dark:bg-yellow-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Glassmorphic Header */}
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/20 sticky top-0 z-50 shadow-lg shadow-purple-500/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                  <span className="text-white font-bold text-xl drop-shadow-lg">T</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">Teleflow Desktop</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Telegram Web 自动回复系统 • AI 赋能</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success" className="shadow-lg shadow-green-500/20 animate-pulse">🟢 在线</Badge>
              <Badge variant="outline" className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50">v1.0.0</Badge>
              
              {/* 主题切换按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 hover:scale-105 transition-transform"
              >
                {actualTheme === 'dark' ? '🌙' : '☀️'}
              </Button>
              
              {/* 设置按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 hover:scale-105 transition-transform"
              >
                ⚙️
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8 z-10">
        {/* 🎨 World-Class Hero Statistics Panel */}
        <HeroStats
          totalAccounts={accounts.filter(a => !a.isNew).length}
          onlineAccounts={Object.values(accountStatus).filter(s => s.online).length}
          unreadMessages={Object.values(accountStatus).reduce((sum, s) => sum + (s.unreadCount || 0), 0)}
          needsLoginCount={Object.values(accountStatus).filter(s => s.needsLogin).length}
        />

        {/* Glassmorphic Accounts List */}
        <Card className="mb-8 backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-white/20 dark:border-gray-700/20 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>账号管理</CardTitle>
                <CardDescription>管理你的 Telegram 自动回复账号</CardDescription>
              </div>
              <Button 
                variant="outline" 
                className="backdrop-blur-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                onClick={handleAddAccount}
              >
                <span className="mr-2">✨</span>
                添加账号
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">还没有配置任何账号</p>
                <Button onClick={handleAddAccount}>创建第一个账号</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {accounts.map((account: SimpleAccount, index: number) => (
                  <AccountCard
                    key={account.name === '__new__' ? `__new__-${index}` : account.name}
                    account={account}
                    isEditing={editingAccount === account.name}
                    tempName={tempAccountName}
                    accountStatus={accountStatus[account.name]}
                    onEdit={() => {
                      setEditingAccount(account.name)
                      setTempAccountName(account.name === '__new__' ? '' : account.name)
                    }}
                    onSave={() => handleSaveAccount(account.name)}
                    onDelete={() => handleDeleteAccount(account.name)}
                    onCancel={() => handleCancelEdit(account.name)}
                    onStart={() => handleStart(account.name)}
                    onStop={() => handleStop(account.name)}
                    onNameChange={setTempAccountName}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Glassmorphic Logs Viewer */}
        <Card className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-white/20 dark:border-gray-700/20 shadow-2xl shadow-indigo-500/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>实时日志</CardTitle>
                <CardDescription>查看系统运行日志</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/50 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600 transition-all duration-200" onClick={handleClearLogs}>
                  <span className="mr-1">🗑️</span>
                  清空
                </Button>
                <Button size="sm" variant="outline" className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/50 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200" onClick={handleExportLogs}>
                  <span className="mr-1">📥</span>
                  导出
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-indigo-900/95 border border-indigo-500/20 text-green-400 p-6 rounded-xl font-mono text-sm h-96 overflow-y-auto shadow-inner">
              {/* Terminal 装饰 */}
              <div className="absolute top-3 left-4 flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg"></div>
              </div>
              <div className="mt-6">
                {logs.length === 0 ? (
                  <p className="text-slate-500 flex items-center">
                    <span className="mr-2 animate-pulse">⏳</span>
                    等待日志输出...
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="hover:bg-indigo-900/30 px-3 py-1.5 rounded transition-colors duration-150 border-l-2 border-transparent hover:border-green-400 group">
                      <span className="text-gray-500 mr-3 group-hover:text-green-500 transition-colors">{String(index + 1).padStart(3, '0')}</span>
                      <span className="text-green-400 group-hover:text-green-300 transition-colors">{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Glassmorphic Footer */}
      <footer className="relative container mx-auto px-6 py-6 mt-12 z-10">
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 border border-white/20 dark:border-gray-700/20 rounded-2xl p-6 shadow-xl">
          <div className="text-center">
            <p className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              Teleflow Desktop • 2025 年度设计
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              <span className="inline-flex items-center">
                <span className="mr-1">⚡</span>
                Powered by Electron + React + TailwindCSS + AI
              </span>
            </p>
          </div>
        </div>
      </footer>
      
      {/* 通知容器 */}
      <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
      
      {/* Telegram 官方风格登录对话框 */}
      <TelegramLoginDialog
        show={loginDialog.show}
        account={loginDialog.account}
        qrCode={accountStatus[loginDialog.account]?.qrCode || loginDialog.qrCode}
        onClose={() => {
          console.log('[LoginDialog] 关闭对话框')
          setLoginDialog({ 
            ...loginDialog, 
            show: false 
          })
        }}
        onSuccess={() => {
          console.log('[LoginDialog] 登录成功')
          success('登录成功', `账号 ${loginDialog.account} 已成功登录`)
        }}
      />
      
      {/* 旧的登录对话框 - 已替换为上面的 TelegramLoginDialog */}
      {false && loginDialog.show && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setLoginDialog({ ...loginDialog, show: false })}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20 dark:border-gray-700/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    登录 Telegram
                  </CardTitle>
                  <CardDescription>账号: {loginDialog.account}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLoginDialog({ ...loginDialog, show: false })}
                  className="rounded-full"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 登录方式切换 */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Button
                  variant={loginDialog.method === 'qr' ? 'default' : 'outline'}
                  onClick={() => setLoginDialog({ ...loginDialog, method: 'qr' })}
                  className="flex-1"
                >
                  <span className="mr-2">📱</span>
                  扫码登录
                </Button>
                <Button
                  variant={loginDialog.method === 'phone' ? 'default' : 'outline'}
                  onClick={() => setLoginDialog({ ...loginDialog, method: 'phone' })}
                  className="flex-1"
                >
                  <span className="mr-2">📞</span>
                  手机号登录
                </Button>
              </div>

              {/* QR 码登录 */}
              {loginDialog.method === 'qr' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                    {/* 嵌入 Telegram Web 页面，直接显示原版二维码 */}
                    <div className="w-full h-[500px] bg-white rounded-xl shadow-lg overflow-hidden">
                      <iframe
                        src="https://web.telegram.org/k/"
                        className="w-full h-full border-0"
                        title="Telegram Web Login"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                      />
                    </div>
                    <div className="text-center mt-4">
                      <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        请使用 Telegram App 扫描二维码
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        扫码后会自动登录，请保持此窗口打开
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">💡</span>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">如何扫码？</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>打开 Telegram App</li>
                          <li>进入 设置 → 设备 → 链接桌面设备</li>
                          <li>扫描上方网页中的二维码</li>
                          <li>登录成功后可关闭此对话框</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 手机号登录 */}
              {loginDialog.method === 'phone' && (
                <div className="space-y-4">
                  {/* 说明为什么需要手机号 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      📱 我们需要验证您的手机号以确认您的身份并保护您的账号安全。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      手机号码 *
                    </label>
                    <div className="flex space-x-2">
                      {/* 国家代码选择器 */}
                      <select
                        value={loginDialog.countryCode}
                        onChange={(e) => setLoginDialog({ ...loginDialog, countryCode: e.target.value })}
                        className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="+86">🇨🇳 +86</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+81">🇯🇵 +81</option>
                        <option value="+82">🇰🇷 +82</option>
                        <option value="+7">🇷🇺 +7</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+852">🇭🇰 +852</option>
                        <option value="+886">🇹🇼 +886</option>
                      </select>
                      {/* 手机号输入（自动格式化） */}
                      <input
                        type="tel"
                        placeholder="138 1234 5678"
                        value={loginDialog.phoneNumber || ''}
                        onChange={(e) => {
                          // 自动格式化：只允许数字和空格
                          const formatted = e.target.value.replace(/[^\d\s]/g, '')
                          setLoginDialog({ ...loginDialog, phoneNumber: formatted })
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 提示：不需要输入国家代码，直接输入手机号即可
                    </p>
                  </div>

                  {/* 接收方式选择 */}
                  {!loginDialog.codeSent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        接收方式
                      </label>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setLoginDialog({ ...loginDialog, otpMethod: 'sms' })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                            loginDialog.otpMethod === 'sms'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">💬</div>
                            <div className="font-medium">短信 SMS</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">推荐方式</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setLoginDialog({ ...loginDialog, otpMethod: 'voice' })}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                            loginDialog.otpMethod === 'voice'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">📞</div>
                            <div className="font-medium">语音电话</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">备用方式</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 发送验证码按钮 */}
                  {!loginDialog.codeSent && (
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                      disabled={!normalizedPhoneNumber || normalizedPhoneNumber.length < 11}
                      onClick={() => {
                        setLoginDialog({ ...loginDialog, codeSent: true, resendCountdown: 60 })
                        info('验证码已发送', `验证码已通过${loginDialog.otpMethod === 'sms' ? '短信' : '语音电话'}发送到 ${loginDialog.countryCode} ${normalizedPhoneNumber}`)
                      }}
                    >
                      <span className="mr-2">📨</span>
                      发送{loginDialog.otpMethod === 'sms' ? '短信' : '语音'}验证码
                    </Button>
                  )}

                  {/* 验证码输入（发送后显示） */}
                  {loginDialog.codeSent && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          验证码 *
                        </label>
                        {/* OTP 专用输入框 */}
                        <div className="flex justify-center space-x-2 mb-3">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <input
                              key={index}
                              type="text"
                              maxLength={1}
                              className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '')
                                if (value && index < 5) {
                                  const nextInput = e.target.nextElementSibling as HTMLInputElement
                                  nextInput?.focus()
                                }
                                // 更新验证码
                                const inputs = e.target.parentElement?.querySelectorAll('input')
                                const code = Array.from(inputs || []).map((input: HTMLInputElement) => input.value).join('')
                                setLoginDialog({ ...loginDialog, verificationCode: code || '' })
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
                                  const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement
                                  prevInput?.focus()
                                }
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          已发送到 {loginDialog.countryCode} {normalizedPhoneNumber}
                        </p>
                      </div>

                      {/* 重新发送验证码 */}
                      <div className="flex items-center justify-center space-x-2">
                        {loginDialog.resendCountdown > 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            ⏱️ {loginDialog.resendCountdown} 秒后可重新发送
                          </p>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLoginDialog({ ...loginDialog, resendCountdown: 60 })
                              info('验证码已重新发送', '请查收短信')
                            }}
                          >
                            <span className="mr-2">🔄</span>
                            重新发送验证码
                          </Button>
                        )}
                      </div>

                      {/* 切换接收方式 */}
                      <div className="text-center">
                        <button
                          onClick={() => {
                            setLoginDialog({ 
                              ...loginDialog, 
                              otpMethod: loginDialog.otpMethod === 'sms' ? 'voice' : 'sms',
                              codeSent: false,
                              resendCountdown: 0
                            })
                          }}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          改用{loginDialog.otpMethod === 'sms' ? '语音电话' : '短信'}接收
                        </button>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setLoginDialog({ ...loginDialog, show: false })}
                        >
                          取消
                        </Button>
                        <Button
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                          disabled={!normalizedVerificationCode || normalizedVerificationCode.length < 6}
                        >
                          <span className="mr-2">🔑</span>
                          验证并登录
                        </Button>
                      </div>
                    </>
                  )}

                  {/* 免责声明 */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    📱 可能会收取短信和数据费用 · 我们不会分享您的手机号
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowSettings(false)}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 z-10 bg-white dark:bg-gray-800 rounded-full"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
