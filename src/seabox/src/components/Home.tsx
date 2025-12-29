import React, { useEffect, useState } from 'react'
import {
    Activity,
    Shield,
    Globe,
    MessageSquare,
    Users,
    Clock,
    Zap,
    Cpu,
    LucideIcon
} from 'lucide-react'
import { clsx } from 'clsx'

interface Stats {
    chars: number
    expiry: string
    activeInstances: number
}

interface StatCardProps {
    title: string
    value: string | number
    subtext?: string
    icon: LucideIcon
    color: string
}

interface FeatureCardProps {
    title: string
    desc: string
    icon: LucideIcon
    color: string
}

export default function Home(): React.ReactElement {
    const [stats, setStats] = useState<Stats>({ chars: 0, expiry: 'Loading...', activeInstances: 0 })
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        // Clock
        const timer = setInterval(() => setTime(new Date()), 1000)

        // Fetch Stats
        fetch('http://127.0.0.1:8000/stats')
            .then(res => res.json())
            .then(data => {
                setStats({
                    chars: data.chars_available,
                    expiry: data.expiry_date,
                    activeInstances: data.active_instances || 3
                })
            })
            .catch(err => console.error("Failed to fetch stats:", err))

        return () => clearInterval(timer)
    }, [])

    const StatCard = ({ title, value, subtext, icon: Icon, color }: StatCardProps) => (
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[hsl(var(--border-subtle))] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 apple-ease">
            <div className={clsx(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-110",
                color
            )} />

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-[hsl(var(--text-secondary))]">{title}</p>
                    <h3 className="mt-2 text-3xl font-bold text-[hsl(var(--text-primary))] tracking-tight">{value}</h3>
                    {subtext && <p className="mt-1 text-xs font-medium text-[hsl(var(--text-tertiary))]">{subtext}</p>}
                </div>
                <div className={clsx("p-2 rounded-lg bg-opacity-10", color.replace('bg-', 'bg-opacity-10 text-'))}>
                    <Icon size={20} className={clsx(color.replace('bg-', 'text-'))} />
                </div>
            </div>
        </div>
    )

    const FeatureCard = ({ title, desc, icon: Icon, color }: FeatureCardProps) => (
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[hsl(var(--border-subtle))] hover:border-[hsl(var(--color-primary))] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 apple-ease cursor-default">
            <div className="flex items-center gap-4">
                <div className={clsx(
                    "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
                    color
                )}>
                    <Icon size={24} className="text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-[hsl(var(--text-primary))]">{title}</h3>
                    <p className="text-sm text-[hsl(var(--text-secondary))]">{desc}</p>
                </div>
            </div>
        </div>
    )

    return (
        <div className="h-full w-full overflow-y-auto bg-[hsl(var(--bg-app))] p-8">
            {/* Header */}
            <header className="flex justify-between items-end mb-10 animate-enter">
                <div>
                    <h1 className="text-2xl font-bold text-[hsl(var(--text-primary))] tracking-tight">Dashboard</h1>
                    <p className="text-[hsl(var(--text-secondary))]">System Overview & Status</p>
                </div>
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-[hsl(var(--border-subtle))]">
                    <Clock size={14} className="text-[hsl(var(--text-tertiary))]" />
                    <span className="text-sm font-medium text-[hsl(var(--text-secondary))] font-mono">
                        {time.toLocaleTimeString()}
                    </span>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="animate-enter delay-100">
                    <StatCard
                        title="Available Characters"
                        value={stats.chars.toLocaleString()}
                        subtext="Translation Quota"
                        icon={Zap}
                        color="bg-blue-500"
                    />
                </div>
                <div className="animate-enter delay-200">
                    <StatCard
                        title="License Expiry"
                        value={stats.expiry}
                        subtext="90 Days Remaining"
                        icon={Shield}
                        color="bg-emerald-500"
                    />
                </div>
                <div className="animate-enter delay-300">
                    <StatCard
                        title="Active Instances"
                        value={stats.activeInstances}
                        subtext="Running Containers"
                        icon={Cpu}
                        color="bg-violet-500"
                    />
                </div>
            </section>

            {/* Features Grid */}
            <section>
                <div className="flex items-center gap-2 mb-6 animate-enter delay-300">
                    <Activity size={18} className="text-[hsl(var(--color-primary))]" />
                    <h2 className="text-lg font-bold text-[hsl(var(--text-primary))]">Core Capabilities</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="animate-enter delay-300">
                        <FeatureCard
                            title="Multi-Account"
                            desc="Simultaneous isolated sessions"
                            icon={Users}
                            color="bg-blue-500"
                        />
                    </div>
                    <div className="animate-enter delay-300">
                        <FeatureCard
                            title="Unified Inbox"
                            desc="Centralized message management"
                            icon={MessageSquare}
                            color="bg-indigo-500"
                        />
                    </div>
                    <div className="animate-enter delay-300">
                        <FeatureCard
                            title="Real-time Translation"
                            desc="Bi-directional AI translation"
                            icon={Globe}
                            color="bg-orange-500"
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}
