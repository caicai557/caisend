import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createFileRoute } from '@tanstack/react-router';
import CockpitHUD from '@/components/posend/CockpitHUD';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useEffect } from 'react';
import { initCockpitListener } from '@/stores/cockpitStore';
export const Route = createFileRoute('/cockpit')({
    component: CockpitPage,
});
/**
 * 幽灵座舱路由页面
 *
 * 这是独立窗口的内容，透明、无边框、始终置顶
 */
function CockpitPage() {
    useEffect(() => {
        // 初始化Tauri事件监听
        initCockpitListener();
        console.log('[CockpitPage] Initialized');
    }, []);
    return (_jsxs("div", { className: "h-screen w-full overflow-hidden", style: {
            // @ts-ignore
            WebkitAppRegion: 'drag'
        }, children: [_jsx(CockpitHUD, {}), _jsx(ToastContainer, {})] }));
}
