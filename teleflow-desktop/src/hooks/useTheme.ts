import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'auto'
export type AccentColor = 'indigo' | 'purple' | 'pink' | 'blue' | 'green'

interface ThemeConfig {
  theme: Theme
  accentColor: AccentColor
}

export function useTheme() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    // 从 localStorage 读取保存的主题
    const saved = localStorage.getItem('theme-config')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { theme: 'light', accentColor: 'indigo' }
      }
    }
    return { theme: 'light', accentColor: 'indigo' }
  })

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // 保存到 localStorage
    localStorage.setItem('theme-config', JSON.stringify(config))

    // 处理 auto 模式
    if (config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setActualTheme(mediaQuery.matches ? 'dark' : 'light')

      const handler = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      setActualTheme(config.theme)
    }
  }, [config])

  useEffect(() => {
    // 应用主题到 document
    if (actualTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // 应用主题色
    document.documentElement.setAttribute('data-accent', config.accentColor)
  }, [actualTheme, config.accentColor])

  const setTheme = (theme: Theme) => {
    setConfig(prev => ({ ...prev, theme }))
  }

  const setAccentColor = (color: AccentColor) => {
    setConfig(prev => ({ ...prev, accentColor: color }))
  }

  const toggleTheme = () => {
    setConfig(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }))
  }

  return {
    theme: config.theme,
    actualTheme,
    accentColor: config.accentColor,
    setTheme,
    setAccentColor,
    toggleTheme
  }
}
