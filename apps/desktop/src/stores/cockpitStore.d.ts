interface AdvanceMode {
    type: 'manual' | 'wait_for_reply' | 'auto_advance';
    delay_ms?: number;
    condition?: {
        match_type: string;
        pattern?: string;
    };
    timeout_ms?: number;
}
interface ScriptStep {
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
export declare const useCockpitStore: import("zustand").UseBoundStore<import("zustand").StoreApi<CockpitState>>;
export declare function initCockpitListener(): void;
export {};
//# sourceMappingURL=cockpitStore.d.ts.map