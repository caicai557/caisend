export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}
interface ToastState {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}
export declare const useToastStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ToastState>>;
export {};
//# sourceMappingURL=toastStore.d.ts.map