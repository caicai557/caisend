import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Command } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

export function CommandPalette() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const navigate = useNavigate()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const handleSelect = (href: string) => {
        navigate({ to: href })
        setIsOpen(false)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--bg-deep)] shadow-2xl"
                    >
                        <div className="flex items-center border-b border-[var(--glass-border)] px-4">
                            <Search className="mr-2 h-5 w-5 text-[var(--text-muted)]" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type a command or search..."
                                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                                autoFocus
                            />
                            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                <span className="px-1.5 py-0.5 rounded border border-[var(--glass-border)] bg-[var(--bg-surface)]">ESC</span>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2">
                            <div className="px-2 py-1.5 text-xs font-medium text-[var(--text-muted)]">Suggestions</div>
                            <CommandItem icon={Command} label="Dashboard" onClick={() => handleSelect('/dashboard')} />
                            <CommandItem icon={Command} label="Workflows" onClick={() => handleSelect('/workflows')} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function CommandItem({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-colors text-left"
        >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </button>
    )
}
