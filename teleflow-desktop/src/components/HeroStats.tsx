import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Users, Wifi, MessageCircle, AlertCircle } from 'lucide-react'

interface Stat {
  label: string
  value: number
  change?: number
  trend?: 'up' | 'down'
  icon: React.ReactNode
  color: string
  urgent?: boolean
}

interface HeroStatsProps {
  totalAccounts: number
  onlineAccounts: number
  unreadMessages: number
  needsLoginCount: number
  previousStats?: {
    totalAccounts: number
    onlineAccounts: number
    unreadMessages: number
  }
}

export default function HeroStats({ 
  totalAccounts, 
  onlineAccounts, 
  unreadMessages, 
  needsLoginCount,
  previousStats 
}: HeroStatsProps) {
  
  const calculateChange = (current: number, previous: number | undefined) => {
    if (!previous) return undefined
    return current - previous
  }

  const stats: Stat[] = [
    {
      label: 'ACCOUNTS',
      value: totalAccounts,
      change: calculateChange(totalAccounts, previousStats?.totalAccounts),
      trend: calculateChange(totalAccounts, previousStats?.totalAccounts) && 
             calculateChange(totalAccounts, previousStats?.totalAccounts)! > 0 ? 'up' : 'down',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'ONLINE',
      value: onlineAccounts,
      change: calculateChange(onlineAccounts, previousStats?.onlineAccounts),
      trend: calculateChange(onlineAccounts, previousStats?.onlineAccounts) && 
             calculateChange(onlineAccounts, previousStats?.onlineAccounts)! > 0 ? 'up' : 'down',
      icon: <Wifi className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'UNREAD',
      value: unreadMessages,
      change: calculateChange(unreadMessages, previousStats?.unreadMessages),
      trend: calculateChange(unreadMessages, previousStats?.unreadMessages) && 
             calculateChange(unreadMessages, previousStats?.unreadMessages)! > 0 ? 'up' : 'down',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'NEED LOGIN',
      value: needsLoginCount,
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'from-yellow-500 to-orange-500',
      urgent: needsLoginCount > 0,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className="group relative"
        >
          {/* Glassmorphism Card */}
          <div className={`
            relative overflow-hidden
            backdrop-blur-xl 
            bg-white/10 dark:bg-white/5
            border border-white/20 dark:border-white/10
            rounded-2xl
            p-6
            shadow-2xl
            transition-all duration-300
            hover:shadow-3xl
            hover:scale-105
            hover:border-white/30
            ${stat.urgent ? 'animate-pulse-slow' : ''}
          `}>
            {/* Gradient Overlay */}
            <div className={`
              absolute inset-0 
              bg-gradient-to-br ${stat.color}
              opacity-0 
              group-hover:opacity-10
              transition-opacity duration-300
            `} />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Icon & Label */}
              <div className="flex items-center justify-between mb-4">
                <div className={`
                  p-3 rounded-xl
                  bg-gradient-to-br ${stat.color}
                  shadow-lg
                  transform group-hover:scale-110 group-hover:rotate-3
                  transition-transform duration-300
                `}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
                
                {/* Trend Indicator */}
                {stat.change !== undefined && stat.change !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`
                      flex items-center space-x-1 px-2 py-1 rounded-full
                      ${stat.trend === 'up' 
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                        : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }
                    `}
                  >
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-xs font-bold">
                      {Math.abs(stat.change)}
                    </span>
                  </motion.div>
                )}
                
                {/* Urgent Badge */}
                {stat.urgent && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2"
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                  </motion.div>
                )}
              </div>
              
              {/* Value */}
              <motion.div
                key={stat.value}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-2"
              >
                <div className={`
                  text-5xl font-bold 
                  bg-gradient-to-br ${stat.color}
                  bg-clip-text text-transparent
                `}>
                  {stat.value}
                </div>
              </motion.div>
              
              {/* Label */}
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 tracking-wider">
                {stat.label}
              </div>
            </div>
            
            {/* Shine Effect */}
            <div className="
              absolute inset-0 
              bg-gradient-to-r from-transparent via-white/10 to-transparent
              opacity-0 group-hover:opacity-100
              transform -translate-x-full group-hover:translate-x-full
              transition-all duration-1000
            " />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
