-- Add behavior_trees table
CREATE TABLE IF NOT EXISTS behavior_trees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition JSON NOT NULL, -- The JSON structure of the tree
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add tree_state table
CREATE TABLE IF NOT EXISTS tree_state (
    account_id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    current_node_id TEXT, -- The ID of the currently executing node
    context JSON, -- Local context/variables for the tree execution
    status TEXT NOT NULL, -- 'running', 'paused', 'completed', 'failed'
    last_tick_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tree_id) REFERENCES behavior_trees(id)
);
