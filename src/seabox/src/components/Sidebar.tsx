import React, { useState } from 'react'
import {
    LayoutDashboard,
    Send,
    Plus,
    Settings,
    Pin
} from 'lucide-react'
import { clsx } from 'clsx'
import { ContextMenu } from './ContextMenu'

interface TelegramInstance {
    id: string
    label: string
    partition: string
    isPinned?: boolean
    isHibernated?: boolean
}

interface SidebarProps {
    setView: (id: string) => void
    width: number
    onResizeStart: () => void
    telegramInstances: TelegramInstance[]
    onAddTelegram: () => void
}

interface MenuItem {
    id: string
    label: string
    subLabel: string
    icon: React.ReactNode
    isPinned?: boolean
    isHibernated?: boolean
}

export default function Sidebar({ setView, width, onResizeStart, telegramInstances, onAddTelegram }: SidebarProps): React.ReactElement {
    const [activeId, setActiveId] = useState('home')
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean
        x: number
        y: number
        targetId: string
        targetLabel: string
        isHibernated?: boolean
        isPinned?: boolean
    } | null>(null)

    const handleContextMenu = (e: React.MouseEvent, item: MenuItem) => {
        if (item.id === 'home') return
        e.preventDefault()
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            targetId: item.id,
            targetLabel: item.label,
            isHibernated: item.isHibernated,
            isPinned: item.isPinned
        })
    }

    const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
        if (window.ipcRenderer) window.ipcRenderer.send(`window:${action}`)
    }

    const handleSetView = (id: string) => {
        setActiveId(id)
        setView(id)
    }

    const menuItems: MenuItem[] = [
        {
            id: 'home',
            label: 'Dashboard',
            subLabel: 'Overview',
            icon: <LayoutDashboard size={18} />
        },
        ...telegramInstances.map((instance, i) => ({
            id: instance.id,
            label: instance.label,
            subLabel: i === 0 ? 'Primary' : `Account ${i}`,
            icon: <Send size={18} />,
            isPinned: instance.isPinned,
            isHibernated: instance.isHibernated
        }))
    ]

    return (
        <div
            className="relative h-screen flex flex-col font-sans select-none shrink-0 glass-sidebar transition-all duration-200"
            style={{ width }}
        >
            {/* Header / Drag Region */}
            <div className="drag-region p-4 pb-2">
                {/* Traffic Lights */}
                <div className="flex items-center gap-2 mb-6 no-drag group/lights opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => handleWindowControl('close')} className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm" />
                    <button onClick={() => handleWindowControl('minimize')} className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm" />
                    <button onClick={() => handleWindowControl('maximize')} className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm" />
                </div>

                {/* App Brand */}
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--color-primary))] to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Send size={18} className="ml-0.5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--text-primary))]">SeaBox</h1>
                        <p className="text-[10px] font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider">Governance</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-drag">
                <div className="text-[10px] font-semibold text-[hsl(var(--text-tertiary))] px-3 py-2 uppercase tracking-wider">
                    Menu
                </div>

                {menuItems.map((item) => {
                    const isActive = activeId === item.id
                    return (
                        <div
                            key={item.id}
                            onClick={() => handleSetView(item.id)}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            className={clsx(
                                "group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 apple-ease",
                                isActive
                                    ? "bg-[hsl(var(--bg-sidebar-active))] text-[hsl(var(--text-on-active))] shadow-sm"
                                    : "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-hover))] hover:text-[hsl(var(--text-primary))]"
                            )}
                        >
                            {/* Icon */}
                            <div className={clsx(
                                "transition-colors duration-200",
                                isActive ? "text-[hsl(var(--text-on-active))]" : "text-[hsl(var(--text-tertiary))] group-hover:text-[hsl(var(--text-primary))]"
                            )}>
                                {item.icon}
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{item.label}</div>
                                {item.isHibernated && (
                                    <div className={clsx(
                                        "text-[10px]",
                                        isActive ? "text-[hsl(var(--text-on-active))/0.8]" : "text-[hsl(var(--text-tertiary))]"
                                    )}>Hibernated</div>
                                )}
                            </div>

                            {/* Pin Indicator */}
                            {item.isPinned && (
                                <Pin size={12} className={clsx(
                                    isActive ? "text-[hsl(var(--text-on-active))/0.8]" : "text-[hsl(var(--text-tertiary))]"
                                )} />
                            )}
                        </div>
                    )
                })}

                <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
                    <div
                        onClick={onAddTelegram}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-hover))] hover:text-[hsl(var(--text-primary))] transition-all"
                    >
                        <div className="w-5 h-5 rounded-md border border-dashed border-[hsl(var(--text-tertiary))] flex items-center justify-center">
                            <Plus size={14} />
                        </div>
                        <span className="text-sm font-medium">Add Account</span>
                    </div>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[hsl(var(--border-subtle))] no-drag">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsl(var(--bg-hover))] cursor-pointer transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--bg-hover))] flex items-center justify-center text-[hsl(var(--text-secondary))] group-hover:bg-[hsl(var(--bg-card))] group-hover:shadow-sm transition-all">
                        <Settings size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[hsl(var(--text-primary))]">Settings</div>
                        <div className="text-[10px] text-[hsl(var(--text-tertiary))]">v1.2.0</div>
                    </div>
                </div>
            </div>

            {/* Resize Handle */}
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[hsl(var(--color-primary))] transition-colors opacity-0 hover:opacity-100 z-50"
                onMouseDown={onResizeStart}
            />

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    {...contextMenu}
                    onClose={() => setContextMenu(null)}
                    onRefresh={(id) => window.ipcRenderer?.send('menu:refresh', id)}
                    onHibernate={(id) => window.ipcRenderer?.send('menu:hibernate', id)}
                    onDelete={(id) => {
                        if (confirm(`Delete ${id}?`)) window.ipcRenderer?.send('menu:delete', id)
                    }}
                    onPin={(id) => window.ipcRenderer?.send('menu:pin', id)}
                    onRename={(id) => {
                        const name = prompt('New name:')
                        if (name) window.ipcRenderer?.send('menu:rename', { id, label: name })
                    }}
                />
            )}
        </div>
    )
}
