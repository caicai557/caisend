-- PBT Definitions
CREATE TABLE IF NOT EXISTS behavior_tree_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    root_node_id TEXT NOT NULL,
    nodes JSON NOT NULL, -- Serialized HashMap<String, BtNode>
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PBT Instances (Runtime State)
CREATE TABLE IF NOT EXISTS behavior_tree_instances (
    id TEXT PRIMARY KEY,
    definition_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    node_states JSON NOT NULL, -- Serialized HashMap<String, NodeRuntimeState>
    blackboard JSON NOT NULL, -- Serialized Blackboard
    status TEXT NOT NULL, -- 'Running', 'Completed', 'Failed', 'Cancelled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(definition_id) REFERENCES behavior_tree_definitions(id)
);

-- Index for fast lookup by account
CREATE INDEX IF NOT EXISTS idx_bt_instances_account ON behavior_tree_instances(account_id);
