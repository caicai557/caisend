import { z } from 'zod';
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    email: string;
}, {
    id: string;
    name: string;
    email: string;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const SystemInfoSchema: z.ZodObject<{
    core_version: z.ZodString;
    initialized: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    core_version: string;
    initialized: boolean;
}, {
    core_version: string;
    initialized: boolean;
}>;
export type SystemInfo = z.infer<typeof SystemInfoSchema>;
export declare const AccountSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    status: z.ZodString;
    proxy_config: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    status: string;
    proxy_config: string | null;
    created_at: string;
}, {
    id: string;
    name: string;
    status: string;
    proxy_config: string | null;
    created_at: string;
}>;
export type Account = z.infer<typeof AccountSchema>;
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodString;
    conversation_id: z.ZodString;
    sender_id: z.ZodString;
    content: z.ZodString;
    message_type: z.ZodString;
    status: z.ZodString;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: string;
    created_at: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: string;
}, {
    id: string;
    status: string;
    created_at: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: string;
}>;
export type Message = z.infer<typeof MessageSchema>;
export declare const ContactSchema: z.ZodObject<{
    id: z.ZodString;
    account_id: z.ZodString;
    remote_id: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    email: z.ZodNullable<z.ZodString>;
    tags: z.ZodNullable<z.ZodString>;
    notes: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string | null;
    email: string | null;
    created_at: string;
    account_id: string;
    remote_id: string;
    phone: string | null;
    tags: string | null;
    notes: string | null;
    updated_at: string;
}, {
    id: string;
    name: string | null;
    email: string | null;
    created_at: string;
    account_id: string;
    remote_id: string;
    phone: string | null;
    tags: string | null;
    notes: string | null;
    updated_at: string;
}>;
export type Contact = z.infer<typeof ContactSchema>;
export declare const DailyStatSchema: z.ZodObject<{
    date: z.ZodString;
    account_id: z.ZodString;
    messages_sent: z.ZodNumber;
    messages_received: z.ZodNumber;
    auto_replies_triggered: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    account_id: string;
    date: string;
    messages_sent: number;
    messages_received: number;
    auto_replies_triggered: number;
}, {
    account_id: string;
    date: string;
    messages_sent: number;
    messages_received: number;
    auto_replies_triggered: number;
}>;
export type DailyStat = z.infer<typeof DailyStatSchema>;
export declare const NodeTypeSchema: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
export declare const NodeConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
    data: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
    data?: any;
}, {
    type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
    data?: any;
}>;
export declare const PositionSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
}, {
    x: number;
    y: number;
}>;
export declare const NodeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    config: z.ZodObject<{
        type: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
        data: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        data?: any;
    }, {
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        data?: any;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
    position: {
        x: number;
        y: number;
    };
    config: {
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        data?: any;
    };
}, {
    id: string;
    type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
    position: {
        x: number;
        y: number;
    };
    config: {
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        data?: any;
    };
}>;
export type Node = z.infer<typeof NodeSchema>;
export declare const EdgeConditionSchema: z.ZodObject<{
    type: z.ZodEnum<["KeywordMatch", "RegexMatch", "Timeout", "Fallback", "Always"]>;
    data: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
    data?: any;
}, {
    type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
    data?: any;
}>;
export declare const EdgeSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    target: z.ZodString;
    condition: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        type: z.ZodEnum<["KeywordMatch", "RegexMatch", "Timeout", "Fallback", "Always"]>;
        data: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
        data?: any;
    }, {
        type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
        data?: any;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    source: string;
    target: string;
    condition?: {
        type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
        data?: any;
    } | null | undefined;
}, {
    id: string;
    source: string;
    target: string;
    condition?: {
        type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
        data?: any;
    } | null | undefined;
}>;
export type Edge = z.infer<typeof EdgeSchema>;
export declare const WorkflowDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    version: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        config: z.ZodObject<{
            type: z.ZodEnum<["Start", "SendMessage", "WaitForResponse", "ConditionalBranch", "AddTag", "End"]>;
            data: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        }, {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        position: {
            x: number;
            y: number;
        };
        config: {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        };
    }, {
        id: string;
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        position: {
            x: number;
            y: number;
        };
        config: {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        };
    }>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
        condition: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            type: z.ZodEnum<["KeywordMatch", "RegexMatch", "Timeout", "Fallback", "Always"]>;
            data: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        }, {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        source: string;
        target: string;
        condition?: {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        } | null | undefined;
    }, {
        id: string;
        source: string;
        target: string;
        condition?: {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        } | null | undefined;
    }>, "many">;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    version: string;
    nodes: Record<string, {
        id: string;
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        position: {
            x: number;
            y: number;
        };
        config: {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        };
    }>;
    edges: {
        id: string;
        source: string;
        target: string;
        condition?: {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        } | null | undefined;
    }[];
}, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    version: string;
    nodes: Record<string, {
        id: string;
        type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
        position: {
            x: number;
            y: number;
        };
        config: {
            type: "Start" | "SendMessage" | "WaitForResponse" | "ConditionalBranch" | "AddTag" | "End";
            data?: any;
        };
    }>;
    edges: {
        id: string;
        source: string;
        target: string;
        condition?: {
            type: "KeywordMatch" | "RegexMatch" | "Timeout" | "Fallback" | "Always";
            data?: any;
        } | null | undefined;
    }[];
}>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export declare const WorkflowInstanceSchema: z.ZodObject<{
    id: z.ZodString;
    definition_id: z.ZodString;
    contact_id: z.ZodString;
    current_node_id: z.ZodNullable<z.ZodString>;
    state_data: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    next_execution_time: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    definition_id: string;
    contact_id: string;
    current_node_id: string | null;
    state_data: string | null;
    next_execution_time: string | null;
}, {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    definition_id: string;
    contact_id: string;
    current_node_id: string | null;
    state_data: string | null;
    next_execution_time: string | null;
}>;
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
//# sourceMappingURL=schemas.d.ts.map