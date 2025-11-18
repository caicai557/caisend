import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { 
  Edit, 
  Trash2, 
  Play, 
  Square, 
  LogIn, 
  Wifi,
  WifiOff,
  AlertCircle,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface AccountCardProps {
  account: any
  isEditing: boolean
  tempName: string
  accountStatus?: any
  onEdit: () => void
  onSave: () => void
  onDelete: () => void
  onCancel: () => void
  onStart: () => void
  onStop: () => void
  onNameChange: (value: string) => void
}

export default function AccountCard({
  account,
  isEditing,
  tempName,
  accountStatus,
  onEdit,
  onSave,
  onDelete,
  onCancel,
  onStart,
  onStop,
  onNameChange
}: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const status = accountStatus || {}
  const isOnline = status.online
  const needsLogin = status.needsLogin !== false
  const isUrgent = needsLogin || (status.unreadCount && status.unreadCount > 10)
  
  // 根据状态确定卡片样式
  const getCardStyle = () => {
    if (needsLogin) {
      return {
        bg: 'bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-red-500/10 dark:from-yellow-500/20 dark:via-orange-500/10 dark:to-red-500/20',
        border: 'border-yellow-400/40 dark:border-yellow-500/40',
        glow: 'shadow-yellow-500/20 hover:shadow-yellow-500/30'
      }
    }
    if (isOnline) {
      return {
        bg: 'bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 dark:from-green-500/10 dark:via-emerald-500/10 dark:to-teal-500/10',
        border: 'border-green-400/30 dark:border-green-500/30',
        glow: 'shadow-green-500/10 hover:shadow-green-500/20'
      }
    }
    return {
      bg: 'bg-white/50 dark:bg-gray-800/50',
      border: 'border-white/20 dark:border-gray-700/20',
      glow: 'shadow-gray-500/10 hover:shadow-gray-500/20'
    }
  }
  
  const cardStyle = getCardStyle()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative group
        backdrop-blur-xl
        ${cardStyle.bg}
        border-2 ${cardStyle.border}
        rounded-2xl
        p-6
        shadow-2xl ${cardStyle.glow}
        transition-all duration-300
        hover:scale-[1.02]
        hover:-translate-y-1
      `}
    >
      {/* 内部脉冲边缘 */}
      {isUrgent && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 rounded-2xl border-2 border-red-500 pointer-events-none z-10"
        />
      )}
      
      {/* 紧急标记 */}
      {isUrgent && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute top-2 right-2 z-20"
        >
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
        </motion.div>
      )}
      
      {/* 顶部：名称和状态 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave()
                if (e.key === 'Escape') onCancel()
              }}
              className="
                w-full px-4 py-2 
                text-lg font-bold 
                bg-white/80 dark:bg-gray-700/80
                border-2 border-indigo-400/50
                rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500
              "
              placeholder="输入账号名称..."
              autoFocus
            />
          ) : (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {account.name}
              </h3>
              {account.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {account.phone}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* 状态指示灯 */}
        <motion.div
          animate={{ scale: isOnline ? [1, 1.2, 1] : 1 }}
          transition={{ repeat: isOnline ? Infinity : 0, duration: 2 }}
          className="flex items-center space-x-2"
        >
          <div className={`
            w-3 h-3 rounded-full shadow-lg
            ${isOnline 
              ? 'bg-green-500 shadow-green-500/50' 
              : needsLogin
              ? 'bg-yellow-500 shadow-yellow-500/50'
              : 'bg-gray-400 shadow-gray-400/50'
            }
          `} />
        </motion.div>
      </div>
      
      {/* 状态徽章 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {isOnline && (
          <Badge variant="success" className="backdrop-blur-sm">
            <Wifi className="w-3 h-3 mr-1" />
            在线
          </Badge>
        )}
        {needsLogin && (
          <Badge variant="warning" className="backdrop-blur-sm">
            <AlertCircle className="w-3 h-3 mr-1" />
            未登录
          </Badge>
        )}
        {!isOnline && !needsLogin && (
          <Badge variant="secondary" className="backdrop-blur-sm">
            <WifiOff className="w-3 h-3 mr-1" />
            离线
          </Badge>
        )}
        {status.unreadCount > 0 && (
          <Badge variant="default" className="backdrop-blur-sm bg-blue-500/80">
            <MessageSquare className="w-3 h-3 mr-1" />
            {status.unreadCount} 未读
          </Badge>
        )}
        {status.chatCount > 0 && (
          <Badge variant="outline" className="backdrop-blur-sm">
            <Users className="w-3 h-3 mr-1" />
            {status.chatCount} 聊天
          </Badge>
        )}
      </div>
      
      {/* 详细信息（可展开） */}
      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-4"
          >
            <div className="
              p-4 
              bg-white/30 dark:bg-gray-700/30 
              rounded-xl 
              space-y-2
              border border-white/20 dark:border-gray-600/20
            ">
              {account.proxy && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">代理:</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{account.proxy}</span>
                </div>
              )}
              {account.monitor_chats && account.monitor_chats.length > 0 && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">监控:</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">
                    {account.monitor_chats.join(', ')}
                  </span>
                </div>
              )}
              {account.forward_rules && account.forward_rules.length > 0 && (
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-20">规则:</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">
                    {account.forward_rules.length} 条转发规则
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={onSave}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg"
              >
                <Edit className="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button
                size="sm"
                onClick={onDelete}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 shadow-lg"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              {needsLogin ? (
                <Button
                  size="sm"
                  onClick={onStart}
                  disabled={account.isNew}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  登录
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onStart}
                  disabled={account.isNew}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg"
                >
                  <Play className="w-4 h-4 mr-1" />
                  启动
                </Button>
              )}
              <Button
                size="sm"
                onClick={onStop}
                disabled={account.isNew}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 shadow-lg"
              >
                <Square className="w-4 h-4 mr-1" />
                停止
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-1" />
                编辑
              </Button>
            </>
          )}
        </div>
        
        {/* 展开/收起按钮 */}
        {!isEditing && (account.proxy || account.monitor_chats?.length > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
      
      {/* 闪光效果 */}
      <div className="
        absolute inset-0 
        bg-gradient-to-r from-transparent via-white/10 to-transparent
        opacity-0 group-hover:opacity-100
        transform -translate-x-full group-hover:translate-x-full
        transition-all duration-1000
        pointer-events-none
        rounded-2xl
      " />
    </motion.div>
  )
}
