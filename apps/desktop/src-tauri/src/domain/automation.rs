use crate::domain::models::Rule;
use crate::domain::events::AppEvent;
use crate::state::AppState;
use std::sync::Arc;

/// 简化版规则引擎 - 仅实现基本的关键词匹配
pub struct SimpleRuleEngine {
    state: Arc<AppState>,
}

impl SimpleRuleEngine {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// 评估消息并返回匹配的规则
    pub async fn evaluate_message(&self, content: &str, account_id: &str) -> Option<Rule> {
        let cache = self.state.rule_cache.read().await;
        
        if let Some(rules) = cache.get(account_id) {
            for rule in rules {
                if !rule.is_enabled {
                    continue;
                }
                
                // 简单的关键词匹配
                if rule.trigger_type == "Keyword" && content.contains(&rule.trigger_pattern) {
                    return Some(rule.clone());
                }
            }
        }
        
        None
    }
}
