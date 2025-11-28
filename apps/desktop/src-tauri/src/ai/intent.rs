use serde::{Serialize, Deserialize};

/// 意图识别结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentResult {
    /// 意图标签，如 "greeting", "question", "complaint"
    pub label: String,
    /// 置信度 [0.0, 1.0]
    pub confidence: f32,
}

impl IntentResult {
    pub fn new(label: impl Into<String>, confidence: f32) -> Self {
        Self {
            label: label.into(),
            confidence: confidence.clamp(0.0, 1.0),
        }
    }
}

/// 预定义意图类型（可扩展）
pub mod intents {
    pub const GREETING: &str = "greeting";
    pub const FAREWELL: &str = "farewell";
    pub const QUESTION: &str = "question";
    pub const COMPLAINT: &str = "complaint";
    pub const AGREEMENT: &str = "agreement";
    pub const DISAGREEMENT: &str = "disagreement";
    pub const UNKNOWN: &str = "unknown";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_intent_result_creation() {
        let result = IntentResult::new("greeting", 0.95);
        assert_eq!(result.label, "greeting");
        assert_eq!(result.confidence, 0.95);
    }

    #[test]
    fn test_confidence_clamping() {
        let result1 = IntentResult::new("test", 1.5);
        assert_eq!(result1.confidence, 1.0);

        let result2 = IntentResult::new("test", -0.5);
        assert_eq!(result2.confidence, 0.0);
    }
}
