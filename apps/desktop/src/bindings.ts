import { invoke } from "@tauri-apps/api/core";

export interface Account {
    id: string;
    name: string;
    status: string;
    proxy_config: string | null;
    created_at: string;
    updated_at: string;
}

export async function createAccount(name: string): Promise<Account> {
    return invoke("create_account", { name });
}

export async function listAccounts(): Promise<Account[]> {
    return invoke("list_accounts");
}

export async function startSession(accountId: string): Promise<void> {
    return invoke("start_session", { accountId });
}

export interface Message {
    id: string;
    account_id: string;
    direction: "in" | "out";
    content: string;
    status: string;
    created_at: number;
}

export async function listMessages(accountId: string): Promise<Message[]> {
    return invoke("list_messages", { accountId });
}

export async function sendMessage(accountId: string, content: string): Promise<Message> {
    return invoke("send_message", { accountId, content });
}

// Rule types
export interface Condition {
    field: string;
    operator: "Contains" | "Equals" | "StartsWith" | "EndsWith" | "Regex";
    value: string;
}

export interface Action {
    action_type: "AutoReply" | "ForwardToUser" | "Translate";
    payload: string;
}

export interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    trigger_type: "MessageReceived";
    conditions: Condition[];
    actions: Action[];
}

// Rule commands
export async function createRule(
    name: string,
    triggerType: string,
    conditions: string,
    actions: string
): Promise<Rule> {
    return invoke("create_rule", { name, triggerType, conditions, actions });
}

export async function listRules(): Promise<Rule[]> {
    return invoke("list_rules");
}

export async function deleteRule(id: string): Promise<void> {
    await invoke("delete_rule", { id });
}

export async function toggleRule(id: string, enabled: boolean): Promise<void> {
    await invoke("toggle_rule", { id, enabled });
}
