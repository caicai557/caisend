import { useEffect, useRef } from 'react'

export interface ChartData {
  label: string
  value: number
  color?: string
}

interface LineChartProps {
  data: number[]
  labels?: string[]
  color?: string
  height?: number
}

export function LineChart({ data, labels, color = '#6366f1', height = 200 }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const padding = 40
    const width = canvas.width
    const chartHeight = canvas.height - padding * 2
    const chartWidth = width - padding * 2

    // 计算数据点
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1

    const points = data.map((value, index) => ({
      x: padding + (index / (data.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - ((value - min) / range) * chartHeight
    }))

    // 绘制渐变区域
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    ctx.moveTo(points[0].x, canvas.height - padding)
    points.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(points[points.length - 1].x, canvas.height - padding)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // 绘制线条
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    points.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // 绘制数据点
    points.forEach(point => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // 绘制网格线
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
    }
    
    ctx.setLineDash([])
  }, [data, color])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  )
}

interface BarChartProps {
  data: ChartData[]
  height?: number
}

export function BarChart({ data, height = 200 }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const padding = 40
    const width = canvas.width
    const chartHeight = canvas.height - padding * 2
    const chartWidth = width - padding * 2

    const max = Math.max(...data.map(d => d.value), 1)
    const barWidth = chartWidth / data.length
    const gap = barWidth * 0.2

    data.forEach((item, index) => {
      const barHeight = (item.value / max) * chartHeight
      const x = padding + index * barWidth + gap
      const y = padding + chartHeight - barHeight
      const width = barWidth - gap * 2

      // 绘制渐变柱子
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      const color = item.color || '#6366f1'
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, color + '80')

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, width, barHeight)

      // 绘制边框
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, width, barHeight)

      // 绘制标签
      ctx.fillStyle = '#374151'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(item.label, x + width / 2, canvas.height - padding + 20)

      // 绘制数值
      ctx.fillStyle = color
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(item.value.toString(), x + width / 2, y - 10)
    })
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  )
}

interface DonutChartProps {
  data: ChartData[]
  size?: number
}

export function DonutChart({ data, size = 200 }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 20
    const innerRadius = radius * 0.6

    const total = data.reduce((sum, item) => sum + item.value, 0)
    let currentAngle = -Math.PI / 2

    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'
    ]

    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * Math.PI * 2
      const color = item.color || colors[index % colors.length]

      // 绘制外圆弧
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
      ctx.closePath()

      const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, radius)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, color + 'cc')
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // 绘制标签
      const labelAngle = currentAngle + sliceAngle / 2
      const labelRadius = radius + 30
      const labelX = centerX + Math.cos(labelAngle) * labelRadius
      const labelY = centerY + Math.sin(labelAngle) * labelRadius

      ctx.fillStyle = color
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${item.label}`, labelX, labelY)
      ctx.font = '10px sans-serif'
      ctx.fillText(`${((item.value / total) * 100).toFixed(1)}%`, labelX, labelY + 15)

      currentAngle += sliceAngle
    })

    // 绘制中心文字
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(total.toString(), centerX, centerY - 5)
    ctx.font = '12px sans-serif'
    ctx.fillText('Total', centerX, centerY + 15)
  }, [data])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="mx-auto"
    />
  )
}
