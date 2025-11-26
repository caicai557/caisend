use serde::{Serialize, Deserialize};
use std::collections::HashMap;

// 流程定义 (存储在 workflow_definitions 表的 JSON 字段中)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    // 节点列表 (Key 是 Node ID)
    pub nodes: HashMap<String, WorkflowNode>,
    // 连接列表
    pub edges: Vec<WorkflowEdge>,
}

// 节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum NodeType {
    Start,          // 开始
    SendMessage,    // 发送消息
    WaitForReply,   // 关键：等待回复 (暂停并等待输入)
    End,            // 结束
}

// 节点 (步骤) - 新版本，支持灵活的 node_type 字符串
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub node_type: String, // 改为字符串以支持 trigger/condition/action
    // 节点配置 (例如发送的消息内容)
    pub config: serde_json::Value,
}

// 边 (连接与判断逻辑)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowEdge {
    pub source_node_id: String,
    pub target_node_id: String,
    // 关键：判断条件 (Condition)
    pub condition: Option<Condition>,
}

// 判断条件 (核心逻辑)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Condition {
    pub match_type: MatchType,
    pub pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum MatchType {
    Keyword,    // 关键词包含
    Regex,      // 正则表达式
    Semantic,   // 语义匹配 (向量相似度)
    Timeout,    // 超时 (需要引擎支持时间触发器)
    #[default]
    Fallback,   // 兜底 (如果其他条件都不满足)
}

// 兼容旧版本的类型别名
pub type Node = WorkflowNode;
pub type Edge = WorkflowEdge;
