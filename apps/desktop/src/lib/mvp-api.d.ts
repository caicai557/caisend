export interface Account {
    id: string;
    name: string;
    status: string;
}
export interface Rule {
    id: string;
    account_id: string | null;
    trigger_type: string;
    trigger_pattern: string;
    reply_text: string | null;
    delay_min_ms: number;
    delay_max_ms: number;
    is_enabled: boolean;
}
export declare function createTestAccount(name: string): Promise<Account>;
export declare function createTestRule(accountId: string, triggerPattern: string, replyText: string): Promise<Rule>;
export declare function testAutomation(accountId: string, testMessage: string): Promise<string>;
export declare function getSystemInfo(): Promise<{
    core_version: string;
    initialized: boolean;
}>;
//# sourceMappingURL=mvp-api.d.ts.map