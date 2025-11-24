import { z } from 'zod';
import { type SystemInfo, type Account, type WorkflowDefinition, type WorkflowInstance } from './schemas';
export declare function invokeCommand<T>(command: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T>;
export declare function ipcGetSystemInfo(): Promise<SystemInfo>;
export declare function ipcCreateAccount(name: string, proxyConfig?: string): Promise<Account>;
export declare function ipcListAccounts(): Promise<Account[]>;
export declare function ipcGetWorkflowDefinition(id: string): Promise<WorkflowDefinition | null>;
export declare function ipcListActiveInstances(): Promise<WorkflowInstance[]>;
export declare function ipcSendMessage(accountId: string, conversationId: string, content: string): Promise<void>;
export declare function ipcSaveWorkflowDefinition(definition: WorkflowDefinition): Promise<void>;
//# sourceMappingURL=ipc.d.ts.map