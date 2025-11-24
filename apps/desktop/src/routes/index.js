import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ipcGetSystemInfo, ipcListAccounts, ipcSendMessage } from '@/lib/ipc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { Wallet, Activity, Send, MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
export const Route = createFileRoute('/')({
    component: Index,
});
// Simulated Real-time Balance Component
function AccountCard({ account, onClick, isSelected }) {
    const [balance, setBalance] = useState(Math.random() * 10000 + 5000);
    const [trend, setTrend] = useState('up');
    useEffect(() => {
        const interval = setInterval(() => {
            const change = (Math.random() - 0.4) * 100; // Slight upward bias
            setBalance(prev => Math.max(0, prev + change));
            setTrend(change > 0 ? 'up' : 'down');
        }, 2000 + Math.random() * 1000); // Random update interval between 2-3s
        return () => clearInterval(interval);
    }, []);
    return (_jsxs("div", { onClick: onClick, className: `
        relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300
        ${isSelected
            ? 'bg-zinc-900/90 ring-1 ring-white/20 shadow-2xl scale-[1.02]'
            : 'bg-zinc-900/40 hover:bg-zinc-900/60 hover:scale-[1.01]'}
        backdrop-blur-xl border border-white/5 group
      `, children: [_jsx("div", { className: `absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl transition-opacity duration-500 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}` }), _jsxs("div", { className: "relative z-10 flex flex-col h-full justify-between", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("div", { className: "p-2 rounded-full bg-white/5 border border-white/10", children: _jsx(Wallet, { className: "w-5 h-5 text-zinc-400" }) }), _jsxs("div", { className: `flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`, children: [trend === 'up' ? _jsx(ArrowUpRight, { className: "w-3 h-3" }) : _jsx(ArrowDownLeft, { className: "w-3 h-3" }), "2.4%"] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-zinc-500 text-sm font-medium mb-1", children: account.name }), _jsxs("div", { className: "text-2xl font-bold text-white tracking-tight tabular-nums", children: ["$", balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-zinc-500", children: [_jsx("span", { children: account.status }), _jsxs("span", { children: ["ID: ", account.id.slice(0, 4)] })] })] })] }));
}
function Index() {
    const _queryClient = useQueryClient();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const { data: _systemInfo } = useQuery({
        queryKey: ['systemInfo'],
        queryFn: ipcGetSystemInfo,
    });
    const { data: accounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: ipcListAccounts,
    });
    // Auto-select first account
    useEffect(() => {
        if (accounts && accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);
    const sendMessageMutation = useMutation({
        mutationFn: async (content) => {
            if (!selectedAccountId)
                return;
            await ipcSendMessage(selectedAccountId, "demo_convo", content);
        },
    });
    useEffect(() => {
        const unlisten = listen('new-message', (event) => {
            console.log("New message received:", event.payload);
            setMessages((prev) => [...prev, event.payload]);
        });
        return () => {
            unlisten.then(f => f());
        };
    }, []);
    return (_jsx("div", { className: "min-h-screen bg-black text-white font-sans selection:bg-white/20", children: _jsxs("div", { className: "p-6 h-screen flex gap-6 overflow-hidden", children: [_jsx("div", { className: "w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar", children: _jsxs("div", { className: "grid grid-cols-1 gap-4", children: [accounts?.map(acc => (_jsx(AccountCard, { account: acc, isSelected: selectedAccountId === acc.id, onClick: () => setSelectedAccountId(acc.id) }, acc.id))), (!accounts || accounts.length === 0) && (_jsx("div", { className: "text-zinc-500 text-center py-10", children: "No accounts connected" }))] }) }), _jsxs("div", { className: "flex-1 bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden flex flex-col backdrop-blur-sm relative", children: [_jsxs("div", { className: "absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent z-20 flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" }), _jsx("span", { className: "text-sm font-medium text-zinc-300", children: "Live Feed" })] }), _jsx(MoreHorizontal, { className: "w-5 h-5 text-zinc-600 cursor-pointer hover:text-white transition-colors" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 pt-20 space-y-6 no-scrollbar", children: [messages.map((msg, i) => (_jsx("div", { className: `flex ${msg.sender_id === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`, children: _jsx("div", { className: `
                        max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed
                        ${msg.sender_id === 'me'
                                            ? 'bg-white text-black rounded-tr-sm shadow-lg shadow-white/5'
                                            : 'bg-zinc-800/50 text-zinc-200 rounded-tl-sm border border-white/5'}
                    `, children: msg.content }) }, i))), messages.length === 0 && (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-zinc-600 gap-4", children: [_jsx(Activity, { className: "w-12 h-12 opacity-20" }), _jsx("p", { className: "text-sm", children: "System Ready. Waiting for activity." })] }))] }), _jsx("div", { className: "p-4 bg-black/20 backdrop-blur-md border-t border-white/5", children: _jsxs("div", { className: "relative flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-full px-4 py-2 focus-within:border-white/30 focus-within:bg-zinc-900/80 transition-all duration-300", children: [_jsx("input", { className: "flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 h-10", value: input, onChange: e => setInput(e.target.value), onKeyDown: e => {
                                            if (e.key === 'Enter' && input) {
                                                sendMessageMutation.mutate(input);
                                                setInput("");
                                            }
                                        }, placeholder: "Type command..." }), _jsx("button", { className: `
                            p-2 rounded-full transition-all duration-300
                            ${input ? 'bg-white text-black hover:scale-110' : 'bg-zinc-800 text-zinc-500'}
                        `, onClick: () => {
                                            if (input) {
                                                sendMessageMutation.mutate(input);
                                                setInput("");
                                            }
                                        }, disabled: sendMessageMutation.isPending, children: _jsx(Send, { className: "w-4 h-4" }) })] }) })] })] }) }));
}
