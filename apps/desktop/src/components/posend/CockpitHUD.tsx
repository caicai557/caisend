import { useCockpitStore, type ScriptStep } from '@/stores/cockpitStore';
import { useToastStore } from '@/stores/toastStore';
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
    const {
        currentFlow,
        currentStepId,
        isAutoReplyEnabled,
        toggleAutoReply,
        manualSendCurrentStep,
    } = useCockpitStore();

    const { addToast } = useToastStore();
    const activeStepRef = useRef<HTMLDivElement>(null);

    // 自动滚动到当前步骤
    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentStepId]);

    // 按钮可见性逻辑
    const isManualSendVisible = (step: ScriptStep) => {
        if (step.id !== currentStepId) return false;
        return !isAutoReplyEnabled || step.advance_mode.type === 'manual';
    };

    const handleManualSend = async () => {
        try {
            await manualSendCurrentStep();
            addToast('success', '指令已发送');
        } catch (e) {
            console.error(e);
            addToast('error', '发送失败，请检查连接');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen w-full flex flex-col p-3 select-none glass-panel overflow-hidden rounded-xl"
        >
            {/* Header Area */}
            <header className="flex items-center justify-between mb-4 px-1 py-1 shrink-0 z-20">
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* 动态呼吸指示灯 */}
                    <motion.div
                        animate={{
                            boxShadow: isAutoReplyEnabled
                                ? ["0 0 0px rgba(59,130,246,0)", "0 0 10px rgba(59,130,246,0.5)", "0 0 0px rgba(59,130,246,0)"]
                                : "none"
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-1.5 h-1.5 rounded-full ${isAutoReplyEnabled ? 'bg-blue-500' : 'bg-zinc-600'}`}
                    />
                    <h2 className="text-sm font-medium text-zinc-200 truncate tracking-wide">
                        {currentFlow?.category_name || '等待指令...'}
                    </h2>
                </div>

                {/* 弹簧开关 (Spring Toggle) */}
                <div
                    onClick={() => toggleAutoReply()}
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors font-semibold">
                        {isAutoReplyEnabled ? 'AUTO' : 'MANUAL'}
                    </span>
                    <div
                        className={`
                            relative w-10 h-5 rounded-full transition-colors duration-300
                            ${isAutoReplyEnabled ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-zinc-800 border border-zinc-700'}
                        `}
                    >
                        <motion.div
                            className={`absolute top-0.5 w-3.5 h-3.5 rounded-full shadow-sm ${isAutoReplyEnabled ? 'bg-blue-400' : 'bg-zinc-400'}`}
                            animate={{ x: isAutoReplyEnabled ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </div>
                </div>
            </header>

            {/* Script List */}
            <LayoutGroup>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1 pb-4 relative">
                    <AnimatePresence mode='popLayout'>
                        {currentFlow?.steps.map((step, index) => {
                            const isActive = step.id === currentStepId;
                            const showButton = isManualSendVisible(step);

                            return (
                                <motion.div
                                    key={step.id}
                                    ref={isActive ? activeStepRef : null}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: isActive ? 1 : 0.6, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`relative rounded-lg p-3 transition-colors duration-300 ${isActive ? 'z-10' : 'z-0'}`}
                                >
                                    {/* ✨ 核心玄机：流体光标 (LayoutId Magic) */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-step-glow"
                                            className="absolute inset-0 bg-blue-500/10 rounded-lg border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    <div className="relative flex gap-3">
                                        {/* 序号 */}
                                        <div className={`
                                            w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5
                                            ${isActive ? 'text-blue-200 bg-blue-500/20' : 'text-zinc-600 bg-zinc-800'}
                                        `}>
                                            {index + 1}
                                        </div>

                                        {/* 内容区域 */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                {step.content}
                                            </p>

                                            {/* 底部元数据与操作栏 */}
                                            <div className="flex items-center justify-between mt-2 h-6">
                                                {/* 模式标签 */}
                                                <div className="flex items-center gap-2">
                                                    <ModeBadge mode={step.advance_mode.type} />
                                                </div>

                                                {/* 发送按钮 (AnimatePresence) */}
                                                <AnimatePresence>
                                                    {showButton && (
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.8, x: 10 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleManualSend();
                                                            }}
                                                            className="
                                                                px-3 py-0.5 text-xs font-medium rounded
                                                                bg-blue-500 text-white shadow-lg shadow-blue-500/30
                                                                hover:bg-blue-400 border border-blue-400/50
                                                            "
                                                        >
                                                            发送
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* 空状态 */}
                    {!currentFlow && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600"
                        >
                            <motion.div
                                className="w-16 h-16 rounded-full bg-zinc-800/30 flex items-center justify-center mb-4 border border-zinc-700/30 backdrop-blur-sm"
                                animate={{
                                    boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 20px rgba(59,130,246,0.1)", "0 0 0px rgba(59,130,246,0)"],
                                    scale: [1, 1.02, 1]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <div className="w-1.5 h-1.5 bg-blue-500/40 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
                            </motion.div>
                            <p className="text-xs tracking-widest uppercase opacity-50">System Idle</p>
                        </motion.div>
                    )}
                </div>
            </LayoutGroup>
        </motion.div>
    );
}

// 辅助组件：模式徽章
function ModeBadge({ mode }: { mode: string }) {
    const config = {
        manual: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'MANUAL' },
        wait_for_reply: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'WAIT' },
        auto_advance: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'AUTO' },
    }[mode] || { color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: mode };

    return (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.color} ${config.bg} border border-white/5`}>
            {config.label}
        </span>
    );
}

export default CockpitHUD;
