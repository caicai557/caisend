use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// 行为树定义 (静态结构)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorTreeDefinition {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub root_node_id: String,
    pub nodes: HashMap<String, BtNode>,
}

/// 行为树节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BtNode {
    pub id: String,
    pub node_type: BtNodeType,
    /// 子节点 ID 列表 (有序)
    pub children: Vec<String>,
    /// 节点配置 (例如 Action 的参数, Condition 的表达式)
    pub config: serde_json::Value,
}

/// 节点类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum BtNodeType {
    // Composites (组合节点)
    Sequence,       // 顺序执行 (AND): 所有子节点成功才成功，遇到失败/运行则停止
    Selector,       // 选择执行 (OR): 只要有一个子节点成功就成功，遇到成功/运行则停止
    Parallel,       // 并行执行: 同时执行所有子节点 (简化版可串行模拟并行状态)

    // Decorators (装饰节点)
    Inverter,       // 取反: 成功变失败，失败变成功
    Repeater,       // 重复: 重复执行子节点 N 次或无限次
    Retry,          // 重试: 子节点失败时重试 N 次

    // Leafs (叶子节点)
    Action,         // 动作: 执行具体任务 (如 SendMessage, Click)
    Condition,      // 条件: 检查状态 (如 IsLoggedIn, HasUnread)
    Wait,           // 等待: 挂起一段时间
    SubTree,        // 子树: 调用另一个行为树
}

impl Default for BtNodeType {
    fn default() -> Self {
        BtNodeType::Sequence
    }
}
