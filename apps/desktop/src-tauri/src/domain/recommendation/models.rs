use serde::{Deserialize, Serialize};

/// 推荐结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    /// 话术 ID (script_steps.id)
    pub snippet_id: String,
    
    /// 话术内容
    pub content: String,
    
    /// 置信度 (0.0-1.0)
    pub confidence: f32,
    
    /// 推荐来源
    pub source: RecommendationSource,
    
    /// 推荐理由
    pub reason: String,
}

/// 推荐来源
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RecommendationSource {
    /// 规则引擎
    Rule,
    
    /// 序列模型
    Sequence,
    
    /// 混合推荐
    Hybrid,
    
    /// 人工选择
    Manual,
}

impl RecommendationSource {
    pub fn as_db_value(&self) -> &'static str {
        match self {
            Self::Rule => "rule",
            Self::Sequence => "sequence",
            Self::Hybrid => "hybrid",
            Self::Manual => "manual",
        }
    }
}

/// 聊天上下文
#[derive(Debug, Clone)]
pub struct ChatContext {
    /// 当前阶段/场景
    pub stage: Option<String>,
    
    /// 最近的消息内容 (用于关键词匹配)
    pub recent_messages: Vec<String>,
    
    /// 自定义元数据
    pub metadata: Option<serde_json::Value>,
}

impl Default for ChatContext {
    fn default() -> Self {
        Self {
            stage: None,
            recent_messages: Vec::new(),
            metadata: None,
        }
    }
}
