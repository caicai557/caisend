import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const SystemInfoSchema = z.object({
    core_version: z.string().min(1),
    initialized: z.boolean(),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    proxy_config: z.string().nullable(),
    created_at: z.string(),
});

export type Account = z.infer<typeof AccountSchema>;

export const MessageSchema = z.object({
    id: z.string(),
    conversation_id: z.string(),
    sender_id: z.string(),
    content: z.string(),
    message_type: z.string(),
    status: z.string(),
    created_at: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ContactSchema = z.object({
    id: z.string(),
    account_id: z.string(),
    remote_id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    tags: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const DailyStatSchema = z.object({
    date: z.string(),
    account_id: z.string(),
    messages_sent: z.number(),
    messages_received: z.number(),
    auto_replies_triggered: z.number(),
});

export type DailyStat = z.infer<typeof DailyStatSchema>;

// Workflow Schemas

export const NodeTypeSchema = z.enum([
    "Start",
    "SendMessage",
    "WaitForResponse",
    "ConditionalBranch",
    "AddTag",
    "End"
]);

export const NodeConfigSchema = z.object({
    type: NodeTypeSchema,
    data: z.any() // Simplified for now, can use discriminated union
});

export const PositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const NodeSchema = z.object({
    id: z.string(),
    type: NodeTypeSchema,
    position: PositionSchema,
    config: NodeConfigSchema,
});

export type Node = z.infer<typeof NodeSchema>;

export const EdgeConditionSchema = z.object({
    type: z.enum(["KeywordMatch", "RegexMatch", "Timeout", "Fallback", "Always"]),
    data: z.any()
});

export const EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    condition: EdgeConditionSchema.nullable().optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

export const WorkflowDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    nodes: z.record(NodeSchema), // HashMap<String, Node>
    edges: z.array(EdgeSchema),
    created_at: z.string(),
    updated_at: z.string(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const WorkflowInstanceSchema = z.object({
    id: z.string(),
    definition_id: z.string(),
    contact_id: z.string(),
    current_node_id: z.string().nullable(),
    state_data: z.string().nullable(),
    status: z.string(),
    next_execution_time: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
