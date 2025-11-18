import { useState, useEffect } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
}

interface NotificationProps {
  notification: Notification
  onDismiss: (id: string) => void
}

const NotificationItem = ({ notification, onDismiss }: NotificationProps) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(notification.id), 300)
    }, notification.duration || 5000)

    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500'
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div
      className={`transform transition-all duration-300 ${
        isExiting 
          ? 'translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100 animate-slide-in'
      }`}
    >
      <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/20 dark:border-gray-700/20 rounded-xl shadow-2xl p-4 min-w-[300px] max-w-md">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[notification.type]} flex items-center justify-center text-white shadow-lg`}>
            <span className="text-xl">{icons[notification.type]}</span>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsExiting(true)
              setTimeout(() => onDismiss(notification.id), 300)
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationContainer({ notifications, onDismiss }: {
  notifications: Notification[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed top-20 right-6 z-50 space-y-4 pointer-events-auto">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { id, type, title, message, duration }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    success: (title: string, message: string, duration?: number) =>
      addNotification('success', title, message, duration),
    error: (title: string, message: string, duration?: number) =>
      addNotification('error', title, message, duration),
    warning: (title: string, message: string, duration?: number) =>
      addNotification('warning', title, message, duration),
    info: (title: string, message: string, duration?: number) =>
      addNotification('info', title, message, duration),
  }
}
