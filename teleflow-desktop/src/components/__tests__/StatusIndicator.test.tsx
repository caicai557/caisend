import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from '../StatusIndicator'

describe('StatusIndicator', () => {
  it('renders idle status correctly', () => {
    render(<StatusIndicator status="idle" />)
    expect(screen.getByText('空闲')).toBeInTheDocument()
  })

  it('renders running status correctly', () => {
    render(<StatusIndicator status="running" />)
    expect(screen.getByText('运行中')).toBeInTheDocument()
  })

  it('renders paused status correctly', () => {
    render(<StatusIndicator status="paused" />)
    expect(screen.getByText('已暂停')).toBeInTheDocument()
  })

  it('renders error status correctly', () => {
    render(<StatusIndicator status="error" />)
    expect(screen.getByText('错误')).toBeInTheDocument()
  })

  it('applies correct color classes for each status', () => {
    const { rerender } = render(<StatusIndicator status="idle" />)
    expect(screen.getByText('空闲').parentElement).toHaveClass('text-gray-500')

    rerender(<StatusIndicator status="running" />)
    expect(screen.getByText('运行中').parentElement).toHaveClass('text-green-500')

    rerender(<StatusIndicator status="paused" />)
    expect(screen.getByText('已暂停').parentElement).toHaveClass('text-yellow-500')

    rerender(<StatusIndicator status="error" />)
    expect(screen.getByText('错误').parentElement).toHaveClass('text-red-500')
  })
})
