use crate::domain::workflow::schema::{Condition, MatchType};
use crate::ai::inference::CognitionService;
use regex::Regex;
use anyhow::Result;
use sqlx::{SqlitePool, Row};

// 评估输入消息是否满足条件
pub async fn evaluate_condition(
    input_message: &str,
    condition: &Condition,
    cognition: Option<&CognitionService>,
    pool: Option<&SqlitePool>,
) -> Result<bool> {
    match condition.match_type {
        MatchType::Keyword => Ok(input_message.to_lowercase().contains(&condition.pattern.as_deref().unwrap_or("").to_lowercase())),
        MatchType::Regex => {
            let pattern = condition.pattern.as_deref().ok_or_else(|| anyhow::anyhow!("Regex pattern missing"))?;
            let re = Regex::new(pattern)?;
            Ok(re.is_match(input_message))
        },
        MatchType::Semantic => {
            // 语义匹配逻辑
            let (Some(cognition), Some(pool)) = (cognition, pool) else {
                tracing::warn!("[Evaluator] Semantic match requested but CognitionService or DB pool missing");
                return Ok(false);
            };

            let target_intent = condition.pattern.as_deref().ok_or_else(|| anyhow::anyhow!("Target intent label missing"))?;
            
            // 1. Encode input message
            let embedding = cognition.encode(input_message)?;
            
            // ... (Mock logic for now, real implementation commented out)
            // tracing::info!("[Evaluator] Semantic match (Mock): input='{}', target='{}'", input_message, target_intent);
            Ok(input_message.contains(target_intent))
        },
        MatchType::Fallback => Ok(true),
        MatchType::Timeout => Ok(false),
    }
}
