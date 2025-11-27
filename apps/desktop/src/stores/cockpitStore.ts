import { create } from 'zustand';

// ========== 类型定义 ==========

export interface AdvanceMode {
    type: 'manual' | 'wait_for_reply' | 'auto_advance';
    delay_ms?: number;
    condition?: {
        match_type: string;
        pattern?: string;
    };
    timeout_ms?: number;
}

export interface ScriptStep {
    id: string;
    order: number;
    content: string;
    advance_mode: AdvanceMode;
}

interface ScriptFlow {
    id: string;
    account_id: string;
    category_name: string;
    steps: ScriptStep[];
    created_at: number;
    updated_at: number;
}

interface HudUpdatePayload {
    account_id: string;
    peer_id: string;
    flow: ScriptFlow | null;
    current_step_id: string | null;
    is_autoreply_enabled: boolean;
}

// Tauri API 类型安全包装
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

async function getTauriInvoke() {
    if (!tauriInvoke) {
        try {
            const tauri = await import('@tauri-apps/api/core');
            tauriInvoke = tauri.invoke;
        } catch {
            // Fallback for non-Tauri environment
            tauriInvoke = async () => { throw new Error('Tauri not available'); };
        }
    }
    return tauriInvoke;
}

// ========== Zustand Store ==========

interface CockpitState {
    activeAccountId: string | null;
    activePeerId: string | null;
    currentFlow: ScriptFlow | null;
    currentStepId: string | null;
    isAutoReplyEnabled: boolean;
    toggleAutoReply: () => Promise<void>;
    manualSendCurrentStep: () => Promise<void>;
    _updateFromPayload: (payload: HudUpdatePayload) => void;
}

export const useCockpitStore = create<CockpitState>((set, get) => ({
    activeAccountId: null,
    activePeerId: null,
    currentFlow: null,
    currentStepId: null,
    isAutoReplyEnabled: false,

    toggleAutoReply: async () => {
        const { activeAccountId } = get();
        if (!activeAccountId) return;

        try {
            const invoke = await getTauriInvoke();
            const newState = await invoke('toggle_account_autoreply', {
                accountId: activeAccountId,
            }) as boolean;
            set({ isAutoReplyEnabled: newState });
        } catch (error) {
            console.error('[CockpitStore] toggleAutoReply failed:', error);
        }
    },

    manualSendCurrentStep: async () => {
        const { activeAccountId, activePeerId, currentStepId } = get();
        if (!activeAccountId || !activePeerId || !currentStepId) return;

        try {
            const invoke = await getTauriInvoke();
            await invoke('execute_and_advance_workflow', {
                accountId: activeAccountId,
                peerId: activePeerId,
                stepId: currentStepId,
            });
        } catch (error) {
            console.error('[CockpitStore] manualSend failed:', error);
        }
    },

    _updateFromPayload: (payload: HudUpdatePayload) => {
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
            listen<HudUpdatePayload>('teleflow/hud-update', (event) => {
                useCockpitStore.getState()._updateFromPayload(event.payload);
            });
        })
        .catch((error) => {
            console.warn('[CockpitStore] Tauri event listener not available:', error);
        });
}
