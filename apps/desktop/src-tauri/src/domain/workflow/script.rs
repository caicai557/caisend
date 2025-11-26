use serde::{Serialize, Deserialize};

/// 话术流程（类别+线性步骤）
/// 对应UI中的"分类"，例如"欢迎话术"、"价格说明"
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScriptFlow {
    pub id: String,
    pub account_id: String,      // 账号隔离
    pub category_name: String,   // 分类名称
    pub steps: Vec<ScriptStep>,  // 线性步骤列表（核心精简）
    pub created_at: i64,
    pub updated_at: i64,
}

/// 单个话术步骤
/// 对应UI中的一行话术项
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScriptStep {
    pub id: String,
    pub order: i32,              // 显示顺序
    pub content: String,         // 话术内容
    pub advance_mode: AdvanceMode, // 推进模式（暗藏玄机）
}

/// 推进模式 - 核心玄机所在
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AdvanceMode {
    /// 手动模式：等待用户在HUD点击"发送"按钮
    Manual,
    
    /// 自动模式：等待对方回复满足条件
    WaitForReply { 
        condition: Condition,
        timeout_ms: Option<u32>,  // 可选超时，超时后回退到手动
    },
    
    /// 自动模式：延迟后自动推进到下一步
    AutoAdvance { 
        delay_ms: u32 
    },
}

/// 条件判断（复用现有Condition）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct Condition {
    pub match_type: MatchType,
    pub pattern: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum MatchType {
    Keyword,    // 关键词包含
    Regex,      // 正则表达式
    Semantic,   // 语义匹配
    Timeout,    // 超时
    #[default]
    Fallback,   // 兜底
}

/// 运行时实例 - 追踪每个对话的进度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScriptInstance {
    pub id: String,
    pub flow_id: String,         // 关联的ScriptFlow
    pub account_id: String,
    pub peer_id: String,         // 对话标识（唯一）
    pub current_step_index: usize, // 当前进度
    pub status: InstanceStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstanceStatus {
    Running,   // 运行中
    Paused,    // 暂停
    Completed, // 已完成
}

/// 账号配置（自动回复开关等）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AccountConfig {
    pub account_id: String,
    pub autoreply_enabled: bool, // 自动回复总开关
    pub updated_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_script_flow_serialization() {
        let flow = ScriptFlow {
            id: "flow1".into(),
            account_id: "acc1".into(),
            category_name: "欢迎话术".into(),
            steps: vec![
                ScriptStep {
                    id: "step1".into(),
                    order: 0,
                    content: "你好！欢迎咨询".into(),
                    advance_mode: AdvanceMode::Manual,
                },
                ScriptStep {
                    id: "step2".into(),
                    order: 1,
                    content: "请问您对什么感兴趣？".into(),
                    advance_mode: AdvanceMode::WaitForReply {
                        condition: Condition {
                            match_type: MatchType::Keyword,
                            pattern: Some("产品".into()),
                        },
                        timeout_ms: Some(30000),
                    },
                },
            ],
            created_at: 1234567890,
            updated_at: 1234567890,
        };

        // 测试序列化
        let json = serde_json::to_string(&flow).unwrap();
        assert!(json.contains("欢迎话术"));
        
        // 测试反序列化
        let deserialized: ScriptFlow = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, flow);
    }

    #[test]
    fn test_advance_mode_variants() {
        let manual = AdvanceMode::Manual;
        let wait = AdvanceMode::WaitForReply {
            condition: Condition::default(),
            timeout_ms: None,
        };
        let auto = AdvanceMode::AutoAdvance { delay_ms: 5000 };

        assert!(serde_json::to_string(&manual).is_ok());
        assert!(serde_json::to_string(&wait).is_ok());
        assert!(serde_json::to_string(&auto).is_ok());
    }
}
