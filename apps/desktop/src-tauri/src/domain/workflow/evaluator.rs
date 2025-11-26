use crate::domain::workflow::schema::{Condition, MatchType};
use regex::Regex;
use anyhow::Result;

// 评估输入消息是否满足条件
pub fn evaluate_condition(input_message: &str, condition: &Condition) -> Result<bool> {
    match condition.match_type {
        MatchType::Keyword => Ok(input_message.contains(condition.pattern.as_deref().unwrap_or(""))),
        MatchType::Regex => {
            let pattern = condition.pattern.as_deref().ok_or_else(|| anyhow::anyhow!("Regex pattern missing"))?;
            let re = Regex::new(pattern)?;
            Ok(re.is_match(input_message))
        },
        MatchType::Fallback => Ok(true),
        // Timeout 需要在引擎层面处理时间，不在此处评估
        MatchType::Timeout => Ok(false),
    }
}
