import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { SystemInfoSchema, AccountSchema, WorkflowDefinitionSchema, WorkflowInstanceSchema } from './schemas';
// Example generic IPC wrapper with Zod validation
export async function invokeCommand(command, args, schema) {
    const result = await invoke(command, args);
    const parsed = schema.safeParse(result);
    if (!parsed.success) {
        console.error(`IPC Validation Failed for command ${command}:`, parsed.error);
        throw new Error(`Invalid data received from backend for ${command}`);
    }
    return parsed.data;
}
export async function ipcGetSystemInfo() {
    const rawData = await invoke('get_system_info');
    // Validation Boundary
    const result = SystemInfoSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [get_system_info]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}
export async function ipcCreateAccount(name, proxyConfig) {
    const rawData = await invoke('create_account', { name, proxyConfig });
    const result = AccountSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [create_account]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}
export async function ipcListAccounts() {
    const rawData = await invoke('list_accounts');
    const result = z.array(AccountSchema).safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [list_accounts]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}
export async function ipcGetWorkflowDefinition(id) {
    const rawData = await invoke('get_workflow_definition', { id });
    if (rawData === null)
        return null;
    const result = WorkflowDefinitionSchema.safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [get_workflow_definition]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}
export async function ipcListActiveInstances() {
    const rawData = await invoke('list_active_instances');
    const result = z.array(WorkflowInstanceSchema).safeParse(rawData);
    if (!result.success) {
        console.error("IPC validation failed [list_active_instances]:", result.error.format());
        throw new Error("Invalid data structure received from Tauri Core");
    }
    return result.data;
}
export async function ipcSendMessage(accountId, conversationId, content) {
    await invoke('send_message', { accountId, conversationId, content });
}
export async function ipcSaveWorkflowDefinition(definition) {
    await invoke('save_workflow_definition', { definition });
}
