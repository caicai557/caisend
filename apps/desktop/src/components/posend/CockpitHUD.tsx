import { useCockpitStore } from '@/stores/cockpitStore';

/**
 * 幽灵座舱HUD - 巧夺天工的艺术品
 * 
 * 设计玄机：
 * - 玻璃拟态（Glassmorphism）
 * - 智能高亮当前步骤
 * - 按钮显示逻辑（暗藏玄机）
 */
export function CockpitHUD() {
    const store = useCockpitStore();

    const {
        currentFlow,
        currentStepId,
        isAutoReplyEnabled,
        toggleAutoReply,
        manualSendCurrentStep,
    } = store;

    // 按钮可见性逻辑（玄机所在）
    const isManualSendVisible = (step: any) => {
        // 必须是当前步骤
        if (step.id !== currentStepId) return false;

        // 方案A：全局手动模式
        // 方案B：该步骤特别标记为Manual
        return !isAutoReplyEnabled || step.advance_mode.type === 'manual';
    };

    return (
        <div
            className="h-screen w-full flex flex-col p-4 select-none bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl"
            style={{
                fontFamily: '"Microsoft YaHei", "微软雅黑", sans-serif',
            }}
        >
            {/* Header - 分类名 + 自动开关 */}
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-sm font-medium text-zinc-300 truncate flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    {currentFlow?.category_name || '未激活'}
                </h2>

                {/* 自动回复开关 */}
                <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors font-medium">
                        {isAutoReplyEnabled ? '自动' : '手动'}
                    </span>
                    <button
                        onClick={toggleAutoReply}
                        className={`
              relative w-11 h-6 rounded-full transition-all duration-300
              ${isAutoReplyEnabled ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-zinc-700'}
            `}
                    >
                        <div
                            className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow-md
                transition-all duration-300 ease-out
                ${isAutoReplyEnabled ? 'left-6' : 'left-1'}
              `}
                        />
                    </button>
                </label>
            </div>

            {/* Script List - 话术列表 */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {currentFlow?.steps.map((step, index) => {
                    const isHighlighted = step.id === currentStepId;
                    const showButton = isManualSendVisible(step);

                    return (
                        <div
                            key={step.id}
                            className={`
                relative group
                rounded-lg transition-all duration-300
                ${isHighlighted
                                    ? 'bg-blue-500/20 border-l-4 border-blue-500 pl-3 pr-3 py-3'
                                    : 'bg-zinc-800/30 border-l-4 border-transparent pl-3 pr-3 py-2.5 hover:bg-zinc-800/50'}
              `}
                        >
                            {/* 步骤序号 */}
                            <div className={`
                absolute -left-1 top-3 w-6 h-6 rounded-full 
                flex items-center justify-center text-xs font-bold
                transition-all duration-300
                ${isHighlighted
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                                    : 'bg-zinc-700 text-zinc-400 group-hover:bg-zinc-600'}
              `}>
                                {index + 1}
                            </div>

                            {/* 话术内容 */}
                            <p className={`
                text-sm leading-relaxed mb-2 ml-6
                ${isHighlighted ? 'text-white font-medium' : 'text-zinc-300'}
              `}>
                                {step.content}
                            </p>

                            {/* 推进模式标签 */}
                            <div className="flex items-center justify-between ml-6">
                                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${step.advance_mode.type === 'manual'
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                        : step.advance_mode.type === 'auto_advance'
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}
                `}>
                                    {step.advance_mode.type === 'manual' ? '手动' :
                                        step.advance_mode.type === 'auto_advance' ? '自动' : '等待回复'}
                                </span>

                                {/* 发送按钮（玄机：条件显示） */}
                                {showButton && (
                                    <button
                                        onClick={manualSendCurrentStep}
                                        className="
                      px-3 py-1 text-xs font-medium
                      bg-white/10 hover:bg-white/20 active:bg-white/30
                      border border-white/20 rounded-md
                      text-white transition-all duration-200
                      hover:scale-105 active:scale-95
                      shadow-lg hover:shadow-xl
                    "
                                    >
                                        发送
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* 空状态 */}
                {!currentFlow && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                        <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">未选择对话</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CockpitHUD;
