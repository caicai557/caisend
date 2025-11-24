CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    nodes TEXT NOT NULL, -- JSON
    edges TEXT NOT NULL, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id TEXT PRIMARY KEY NOT NULL,
    definition_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    current_node_id TEXT,
    state_data TEXT, -- JSON
    status TEXT NOT NULL, -- Running, WaitingForResponse, Scheduled, Completed, Failed
    next_execution_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (definition_id) REFERENCES workflow_definitions(id)
);
