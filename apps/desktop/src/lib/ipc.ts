import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { SystemInfoSchema, type SystemInfo, AccountSchema, type Account, WorkflowDefinitionSchema, type WorkflowDefinition, WorkflowInstanceSchema, type WorkflowInstance } from './schemas';

// Example generic IPC wrapper with Zod validation
export async function invokeCommand<T>(
    command: string,
    args: Record<string, unknown>,
    schema: z.ZodType<T>
): Promise<T> {
    const result = await invoke(command, args);
    const parsed = schema.safeParse(result);

    if (!parsed.success) {
        console.error(`IPC Validation Failed for command ${command}:`, parsed.error);
        throw new Error(`Invalid data received from backend for ${command}`);
    }

    return parsed.data;
}

export async function ipcGetSystemInfo(): Promise<SystemInfo> {
    const rawData = await invoke('get_system_info');

    // Validation Boundary
    const result = SystemInfoSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [get_system_info]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}

export async function ipcCreateAccount(name: string, proxyConfig?: string): Promise<Account> {
    const rawData = await invoke('create_account', { name, proxyConfig });
    const result = AccountSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [create_account]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}

export async function ipcListAccounts(): Promise<Account[]> {
    const rawData = await invoke('list_accounts');
    const result = z.array(AccountSchema).safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [list_accounts]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}

export async function ipcGetWorkflowDefinition(id: string): Promise<WorkflowDefinition | null> {
    const rawData = await invoke('get_workflow_definition', { id });
    if (rawData === null) return null;
    const result = WorkflowDefinitionSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [get_workflow_definition]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}

export async function ipcListActiveInstances(): Promise<WorkflowInstance[]> {
    const rawData = await invoke('list_active_instances');
    const result = z.array(WorkflowInstanceSchema).safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [list_active_instances]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}

export async function ipcSendMessage(accountId: string, conversationId: string, content: string): Promise<void> {
    await invoke('send_message', { accountId, conversationId, content });
}

export async function ipcSaveWorkflowDefinition(definition: WorkflowDefinition): Promise<void> {
    await invoke('save_workflow_definition', { definition });
}
