# PBT Test Script

This script demonstrates how to test the PBT functionality via Tauri commands.

## Prerequisites
1. Application running (`npm run tauri dev`)
2. An account spawned and connected
3. Browser dev console open

## Test Steps

### 1. Load Sample Definition

```javascript
// Read the conversation_flow.json sample
const sampleDef = {
  "name": "Simple Conversation Flow",
  "description": "A simple behavior tree that responds to keywords in messages",
  "root_node_id": "root",
  "nodes": {
    "root": {
      "id": "root",
      "node_type": "Selector",
      "config": {
        "children": ["help_branch", "default_reply"]
      }
    },
    "help_branch": {
      "id": "help_branch",
      "node_type": "Sequence",
      "config": {
        "children": ["check_help", "send_help"]
      }
    },
    "check_help": {
      "id": "check_help",
      "node_type": "Condition",
      "config": {
        "condition_type": "HasKeyword",
        "keyword": "help"
      }
    },
    "send_help": {
      "id": "send_help",
      "node_type": "Action",
      "config": {
        "action_type": "send_message",
        "peer_id": "test_peer",
        "content": "你好！我是自动客服。有什么可以帮助你的吗？"
      }
    },
    "default_reply": {
      "id": "default_reply",
      "node_type": "Action",
      "config": {
        "action_type": "send_message",
        "peer_id": "test_peer",
        "content": "收到你的消息了，稍后回复。"
      }
    }
  }
};

// Create the definition
const definitionId = await window.__TAURI__.core.invoke('create_pbt_definition', {
  name: sampleDef.name,
  description: sampleDef.description,
  rootNodeId: sampleDef.root_node_id,
  nodesJson: JSON.stringify(sampleDef.nodes)
});

console.log('Created definition:', definitionId);
```

### 2. Create Instance for Account

```javascript
// Replace 'account_123' with your actual account ID
const instanceId = await window.__TAURI__.core.invoke('create_pbt_instance', {
  definitionId: definitionId,
  accountId: 'account_123'
});

console.log('Created instance:', instanceId);
```

### 3. Check Instance Status

```javascript
const status = await window.__TAURI__.core.invoke('get_pbt_instance_status', {
  instanceId: instanceId
});

console.log('Instance status:', status);
```

### 4. Trigger Manual Tick

```javascript
const result = await window.__TAURI__.core.invoke('trigger_pbt_tick', {
  accountId: 'account_123'
});

console.log('Tick result:', result);
```

### 5. Verify in Logs

Check the Rust logs for PBT execution traces:
- `[AccountActor] Tick success, status: Running`
- `[AccountActionContext] Executing action: send_message`
- `[BehaviorTreeEngine]` execution details

## Expected Behavior

1. After creating the instance, it should be in `Running` status
2. The automatic tick loop (every 5 seconds) will process the tree
3. If the account is connected, actions will execute via CDP
4. State changes are persisted to the database
5. On restart, the instance state is restored

## Database Verification

```sql
-- Check definitions
SELECT * FROM behavior_tree_definitions;

-- Check instances
SELECT * FROM behavior_tree_instances;

-- Check active instances for an account
SELECT * FROM behavior_tree_instances 
WHERE account_id = 'account_123' AND status = 'Running';
```

## Troubleshooting

- If commands fail, check Rust error logs
- Ensure account actor is spawned and connected
- Verify database migrations have run
- Check that BehaviorTreeRepository is properly injected into state
