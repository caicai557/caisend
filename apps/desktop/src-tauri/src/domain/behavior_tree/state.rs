use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// 行为树实例 (运行时状态)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorTreeInstance {
    pub id: String,
    pub definition_id: String,
    pub account_id: String,
    
    /// 节点状态映射 (NodeID -> Status)
    /// 仅存储 Running 或有状态的节点，Success/Failure 通常是瞬态的，
    /// 但为了持久化"当前执行位置"，我们需要知道哪些节点正在运行。
    pub node_states: HashMap<String, NodeRuntimeState>,
    
    /// 黑板 (共享内存)
    pub blackboard: Blackboard,
    
    pub status: TreeStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TreeStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// 节点运行时状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeRuntimeState {
    pub status: NodeStatus,
    /// 节点特定的上下文数据 (例如 Loop 次数, Wait 开始时间)
    pub context: serde_json::Value,
}

/// 节点执行结果状态
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum NodeStatus {
    Success,    // 成功
    Failure,    // 失败
    Running,    // 正在运行 (需要挂起等待下一次 tick)
    Skipped,    // 跳过 (未执行)
}

/// 黑板 (Blackboard) - 用于节点间共享数据
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Blackboard {
    data: HashMap<String, serde_json::Value>,
}

impl Blackboard {
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    pub fn get(&self, key: &str) -> Option<&serde_json::Value> {
        self.data.get(key)
    }

    pub fn set(&mut self, key: String, value: serde_json::Value) {
        self.data.insert(key, value);
    }
    
    pub fn has(&self, key: &str) -> bool {
        self.data.contains_key(key)
    }
}
