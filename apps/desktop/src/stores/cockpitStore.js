import { create } from 'zustand';
// Tauri API 类型安全包装
let tauriInvoke = null;
async function getTauriInvoke() {
    if (!tauriInvoke) {
        try {
            const tauri = await import('@tauri-apps/api/core');
            tauriInvoke = tauri.invoke;
        }
        catch {
            // Fallback for non-Tauri environment
            tauriInvoke = async () => { throw new Error('Tauri not available'); };
        }
    }
    return tauriInvoke;
}
export const useCockpitStore = create((set, get) => ({
    activeAccountId: null,
    activePeerId: null,
    currentFlow: null,
    currentStepId: null,
    isAutoReplyEnabled: false,
    toggleAutoReply: async () => {
        const { activeAccountId } = get();
        if (!activeAccountId)
            return;
        try {
            const invoke = await getTauriInvoke();
            const newState = await invoke('toggle_account_autoreply', {
                accountId: activeAccountId,
            });
            set({ isAutoReplyEnabled: newState });
        }
        catch (error) {
            console.error('[CockpitStore] toggleAutoReply failed:', error);
        }
    },
    manualSendCurrentStep: async () => {
        const { activeAccountId, activePeerId, currentStepId } = get();
        if (!activeAccountId || !activePeerId || !currentStepId)
            return;
        try {
            const invoke = await getTauriInvoke();
            await invoke('execute_and_advance_workflow', {
                accountId: activeAccountId,
                peerId: activePeerId,
                stepId: currentStepId,
            });
        }
        catch (error) {
            console.error('[CockpitStore] manualSend failed:', error);
        }
    },
    _updateFromPayload: (payload) => {
        set({
            activeAccountId: payload.account_id,
            activePeerId: payload.peer_id,
            currentFlow: payload.flow,
            currentStepId: payload.current_step_id,
            isAutoReplyEnabled: payload.is_autoreply_enabled,
        });
    },
}));
export function initCockpitListener() {
    import('@tauri-apps/api/event')
        .then(({ listen }) => {
        listen('teleflow/hud-update', (event) => {
            useCockpitStore.getState()._updateFromPayload(event.payload);
        });
    })
        .catch((error) => {
        console.warn('[CockpitStore] Tauri event listener not available:', error);
    });
}
