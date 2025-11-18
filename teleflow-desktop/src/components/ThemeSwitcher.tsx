import { useTheme, type Theme, type AccentColor } from '../hooks/useTheme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

export function ThemeSwitcher() {
  const { theme, actualTheme, accentColor, setTheme, setAccentColor } = useTheme()

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'auto', label: '自动', icon: '🔄' },
  ]

  const colors: { value: AccentColor; label: string; class: string }[] = [
    { value: 'indigo', label: '靛蓝', class: 'bg-indigo-500' },
    { value: 'purple', label: '紫色', class: 'bg-purple-500' },
    { value: 'pink', label: '粉色', class: 'bg-pink-500' },
    { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
    { value: 'green', label: '绿色', class: 'bg-green-500' },
  ]

  return (
    <div className="space-y-6">
      {/* 主题模式 */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-white/20 dark:border-gray-700/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
            主题模式
          </CardTitle>
          <CardDescription>选择你喜欢的界面风格</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(t => (
              <Button
                key={t.value}
                variant={theme === t.value ? 'default' : 'outline'}
                className={`${
                  theme === t.value
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0'
                    : 'backdrop-blur-sm bg-white/50 dark:bg-gray-800/50'
                }`}
                onClick={() => setTheme(t.value)}
              >
                <span className="mr-2">{t.icon}</span>
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 主题色 */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-white/20 dark:border-gray-700/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🎨</span>
            主题色
          </CardTitle>
          <CardDescription>自定义你的个性化配色</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => setAccentColor(c.value)}
                className={`group relative flex flex-col items-center space-y-2 p-3 rounded-xl transition-all duration-200 ${
                  accentColor === c.value
                    ? 'bg-white/80 dark:bg-gray-800/80 shadow-lg scale-110'
                    : 'hover:bg-white/50 dark:hover:bg-gray-800/50 hover:scale-105'
                }`}
              >
                <div className={`w-12 h-12 rounded-full ${c.class} shadow-lg ${
                  accentColor === c.value ? 'ring-4 ring-offset-2 ring-white/50 dark:ring-gray-700/50' : ''
                }`}></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {c.label}
                </span>
                {accentColor === c.value && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 预览 */}
      <Card className="backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-white/20 dark:border-gray-700/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">👁️</span>
            预览效果
          </CardTitle>
          <CardDescription>当前主题的效果展示</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg backdrop-blur-sm bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/20">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                这是一段示例文字，展示当前主题的文字样式
              </p>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                主要按钮
              </Button>
              <Button size="sm" variant="outline" className="backdrop-blur-sm">
                次要按钮
              </Button>
              <Button size="sm" variant="ghost">
                文字按钮
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
