import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCockpitStore } from '@/stores/cockpitStore';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useEffect, useRef } from 'react';
/**
 * 幽灵座舱 HUD v2.0 - The Artifact
 *
 * 设计哲学：
 * - 流体动效 (Fluid Motion): 使用 Framer Motion 实现平滑的状态流转
 * - 视觉深度 (Visual Depth): 增强的玻璃拟态与动态光效
 * - 极简主义 (Minimalism): 隐藏干扰元素，聚焦核心信息
 */
export function CockpitHUD() {
    const store = useCockpitStore();
    const { currentFlow, currentStepId, isAutoReplyEnabled, toggleAutoReply, manualSendCurrentStep, } = store;
    // 自动滚动到当前步骤
    const activeStepRef = useRef(null);
    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentStepId]);
    // 按钮可见性逻辑
    const isManualSendVisible = (step) => {
        if (step.id !== currentStepId)
            return false;
        return !isAutoReplyEnabled || step.advance_mode.type === 'manual';
    };
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "h-screen w-full flex flex-col p-3 select-none glass-panel overflow-hidden rounded-xl", children: [_jsxs("header", { className: "flex items-center justify-between mb-4 px-1 py-1 shrink-0 z-20", children: [_jsxs("div", { className: "flex items-center gap-3 overflow-hidden", children: [_jsx(motion.div, { animate: {
                                    boxShadow: isAutoReplyEnabled
                                        ? ["0 0 0px rgba(59,130,246,0)", "0 0 10px rgba(59,130,246,0.5)", "0 0 0px rgba(59,130,246,0)"]
                                        : "none"
                                }, transition: { duration: 2, repeat: Infinity }, className: `w-1.5 h-1.5 rounded-full ${isAutoReplyEnabled ? 'bg-blue-500' : 'bg-zinc-600'}` }), _jsx("h2", { className: "text-sm font-medium text-zinc-200 truncate tracking-wide", children: currentFlow?.category_name || '等待指令...' })] }), _jsxs("div", { onClick: () => toggleAutoReply(), className: "flex items-center gap-2 cursor-pointer group", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors font-semibold", children: isAutoReplyEnabled ? 'AUTO' : 'MANUAL' }), _jsx("div", { className: `
                            relative w-10 h-5 rounded-full transition-colors duration-300
                            ${isAutoReplyEnabled ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-zinc-800 border border-zinc-700'}
                        `, children: _jsx(motion.div, { className: `absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-sm ${isAutoReplyEnabled ? 'bg-blue-400' : 'bg-zinc-400'}`, animate: { x: isAutoReplyEnabled ? 22 : 2 }, transition: { type: "spring", stiffness: 500, damping: 30 } }) })] })] }), _jsx(LayoutGroup, { children: _jsxs("div", { className: "flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1 pb-4 relative", children: [_jsx(AnimatePresence, { mode: 'popLayout', children: currentFlow?.steps.map((step, index) => {
                                const isActive = step.id === currentStepId;
                                const showButton = isManualSendVisible(step);
                                return (_jsxs(motion.div, { ref: isActive ? activeStepRef : null, layout: true, initial: { opacity: 0, x: -20 }, animate: { opacity: isActive ? 1 : 0.6, x: 0 }, exit: { opacity: 0, scale: 0.9 }, className: `relative rounded-lg p-3 transition-colors duration-300 ${isActive ? 'z-10' : 'z-0'}`, children: [isActive && (_jsx(motion.div, { layoutId: "active-step-glow", className: "absolute inset-0 bg-blue-500/10 rounded-lg border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]", transition: { type: "spring", stiffness: 300, damping: 30 } })), _jsxs("div", { className: "relative flex gap-3", children: [_jsx("div", { className: `
                                            w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5
                                            ${isActive ? 'text-blue-200 bg-blue-500/20' : 'text-zinc-600 bg-zinc-800'}
                                        `, children: index + 1 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `text-sm leading-relaxed whitespace-pre-wrap ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`, children: step.content }), _jsxs("div", { className: "flex items-center justify-between mt-2 h-6", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx(ModeBadge, { mode: step.advance_mode.type }) }), _jsx(AnimatePresence, { children: showButton && (_jsx(motion.button, { initial: { opacity: 0, scale: 0.8, x: 10 }, animate: { opacity: 1, scale: 1, x: 0 }, exit: { opacity: 0, scale: 0.8 }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: (e) => {
                                                                            e.stopPropagation();
                                                                            manualSendCurrentStep();
                                                                        }, className: "\r\n                                                                px-3 py-0.5 text-xs font-medium rounded\r\n                                                                bg-blue-500 text-white shadow-lg shadow-blue-500/30\r\n                                                                hover:bg-blue-400 border border-blue-400/50\r\n                                                            ", children: "\u53D1\u9001" })) })] })] })] })] }, step.id));
                            }) }), !currentFlow && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "absolute inset-0 flex flex-col items-center justify-center text-zinc-600", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4 border border-zinc-700/50", children: _jsx("div", { className: "w-2 h-2 bg-zinc-600 rounded-full animate-pulse" }) }), _jsx("p", { className: "text-xs tracking-widest uppercase opacity-50", children: "System Idle" })] }))] }) })] }));
}
// 辅助组件：模式徽章
function ModeBadge({ mode }) {
    const config = {
        manual: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'MANUAL' },
        wait_for_reply: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'WAIT' },
        auto_advance: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'AUTO' },
    }[mode] || { color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: mode };
    return (_jsx("span", { className: `text-[9px] font-bold px-1.5 py-0.5 rounded ${config.color} ${config.bg} border border-white/5`, children: config.label }));
}
export default CockpitHUD;
