import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useToastStore } from '@/stores/toastStore';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
const icons = {
    success: _jsx(CheckCircle, { className: "w-5 h-5 text-green-400" }),
    error: _jsx(AlertCircle, { className: "w-5 h-5 text-red-400" }),
    info: _jsx(Info, { className: "w-5 h-5 text-blue-400" }),
    warning: _jsx(AlertTriangle, { className: "w-5 h-5 text-yellow-400" }),
};
const colors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
};
export const ToastContainer = () => {
    const { toasts, removeToast } = useToastStore();
    return (_jsx("div", { className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", children: _jsx(AnimatePresence, { mode: 'popLayout', children: toasts.map((toast) => (_jsxs(motion.div, { layout: true, initial: { opacity: 0, y: -20, scale: 0.9 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }, className: `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg min-w-[300px] ${colors[toast.type]}`, children: [icons[toast.type], _jsx("span", { className: "text-sm font-medium text-white/90 flex-1", children: toast.message }), _jsx("button", { onClick: () => removeToast(toast.id), className: "p-1 hover:bg-white/10 rounded-full transition-colors", children: _jsx(X, { className: "w-4 h-4 text-white/50" }) })] }, toast.id))) }) }));
};
