# PBT Test Script

This script demonstrates how to test the PBT functionality via Tauri commands.

## Prerequisites
1. Application running (`npm run tauri dev`)
2. An account spawned and connected
3. Browser dev console open

## Test Steps

### 1. Load Sample Definition

**在浏览器控制台中执行（Tauri v2 方式）：**

```javascript
// 导入 Tauri invoke 函数
const { invoke } = window.__TAURI_INTERNALS__;

// 1. 创建简单测试定义
const defId = await invoke('create_simple_test_definition');
console.log('✅ 定义创建成功，ID:', defId);

// 2. 为测试账户创建实例
const instanceId = await invoke('create_pbt_instance', {
  definitionId: defId,
  accountId: 'test-1'  // 使用实际的账户ID
});
console.log('✅ 实例创建成功，ID:', instanceId);
```

### 2. Check Instance Status

```javascript
// 查看实例状态
const status = await invoke('get_pbt_instance_status', {
  instanceId: instanceId
});
console.log('📊 实例状态:', status);
```

### 3. Trigger Manual Tick

```javascript
// 手动触发 tick
const result = await invoke('trigger_pbt_tick', {
  accountId: 'test-1'
});
console.log('⚡ Tick 结果:', result);
```

### 4. Get Active Instance

```javascript
// 获取活跃实例
const active = await invoke('get_active_pbt_instance', {
  accountId: 'test-1'
});
console.log('🔄 活跃实例:', active);
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
