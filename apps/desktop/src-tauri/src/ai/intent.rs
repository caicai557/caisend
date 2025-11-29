use serde::{Serialize, Deserialize};

/// Intent classification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentResult {
    pub label: String,
    pub confidence: f32,
}

impl IntentResult {
    pub fn new<S: Into<String>>(label: S, confidence: f32) -> Self {
        Self {
            label: label.into(),
            confidence,
        }
    }
}

/// Standard intent labels
/// 
/// These are commonly recognized intents for conversational AI
pub mod intents {
    // Greetings & Farewells
    pub const GREETING: &str = "greeting";
    pub const FAREWELL: &str = "farewell";
    
    // Questions & Information Seeking
    pub const QUESTION: &str = "question";
    pub const HELP_REQUEST: &str = "help_request";
    pub const CLARIFICATION: &str = "clarification";
    
    // Affirmations & Negations
    pub const CONFIRMATION: &str = "confirmation";
    pub const REJECTION: &str = "rejection";
    pub const AGREEMENT: &str = "agreement";
    pub const DISAGREEMENT: &str = "disagreement";
    
    // Requests & Actions
    pub const REQUEST: &str = "request";
    pub const COMMAND: &str = "command";
    pub const SUGGESTION: &str = "suggestion";
    
    // Emotions & Sentiments
    pub const THANKS: &str = "thanks";
    pub const APOLOGY: &str = "apology";
    pub const COMPLAINT: &str = "complaint";
    pub const PRAISE: &str = "praise";
    
    // Status & State
    pub const ACKNOWLEDGMENT: &str = "acknowledgment";
    pub const WAITING: &str = "waiting";
    
    // Fallback
    pub const UNKNOWN: &str = "unknown";
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json; // Add this for serialization tests

    #[test]
    fn test_intent_result() {
        let result = IntentResult::new(intents::GREETING, 0.95);
        assert_eq!(result.label, "greeting");
        assert_eq!(result.confidence, 0.95);
    }

    #[test]
    fn test_intent_result_serialization() {
        let result = IntentResult::new(intents::QUESTION, 0.85);
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("question"));
        
        let deserialized: IntentResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.label, "question");
        assert_eq!(deserialized.confidence, 0.85);
    }
}
