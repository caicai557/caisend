//! Keyword Matcher - Fast multi-pattern matching using Aho-Corasick
//!
//! The "Reflex Layer" - processes in <1ms for known keywords.

use aho_corasick::{AhoCorasick, Match};
use std::collections::HashMap;

/// Intent categories for classification
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum IntentCategory {
    Positive,      // Yes, OK, Sure, etc.
    Negative,      // No, Not interested, etc.
    Question,      // What, Where, How, etc.
    Greeting,      // Hi, Hello, etc.
    Farewell,      // Bye, Goodbye, etc.
    Urgency,       // ASAP, Urgent, Now, etc.
    StopRequest,   // Stop, Unsubscribe, etc.
    Unknown,
}

/// A keyword definition with its associated intent
#[derive(Debug, Clone)]
pub struct KeywordRule {
    pub pattern: String,
    pub category: IntentCategory,
    pub weight: f32,
}

/// Fast keyword matcher using Aho-Corasick algorithm
pub struct KeywordMatcher {
    automaton: AhoCorasick,
    rules: Vec<KeywordRule>,
}

impl KeywordMatcher {
    /// Create a new matcher with default rules
    pub fn new() -> Self {
        let rules = Self::default_rules();
        let patterns: Vec<&str> = rules.iter().map(|r| r.pattern.as_str()).collect();
        
        let automaton = AhoCorasick::builder()
            .ascii_case_insensitive(true)
            .build(&patterns)
            .expect("Failed to build Aho-Corasick automaton");

        Self { automaton, rules }
    }

    /// Create with custom rules
    pub fn with_rules(rules: Vec<KeywordRule>) -> Self {
        let patterns: Vec<&str> = rules.iter().map(|r| r.pattern.as_str()).collect();
        
        let automaton = AhoCorasick::builder()
            .ascii_case_insensitive(true)
            .build(&patterns)
            .expect("Failed to build Aho-Corasick automaton");

        Self { automaton, rules }
    }

    /// Match all keywords in the input text
    pub fn find_all(&self, text: &str) -> Vec<&KeywordRule> {
        self.automaton
            .find_iter(text)
            .map(|m: Match| &self.rules[m.pattern().as_usize()])
            .collect()
    }

    /// Get the dominant intent category from matches
    pub fn classify(&self, text: &str) -> (IntentCategory, f32) {
        let matches = self.find_all(text);
        
        if matches.is_empty() {
            return (IntentCategory::Unknown, 0.0);
        }

        // Aggregate weights by category
        let mut scores: HashMap<IntentCategory, f32> = HashMap::new();
        for m in &matches {
            *scores.entry(m.category.clone()).or_insert(0.0) += m.weight;
        }

        // Find the highest scoring category
        scores
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .map(|(cat, score)| (cat, score))
            .unwrap_or((IntentCategory::Unknown, 0.0))
    }

    /// Default keyword rules for common intents
    fn default_rules() -> Vec<KeywordRule> {
        vec![
            // Positive
            KeywordRule { pattern: "yes".to_string(), category: IntentCategory::Positive, weight: 1.0 },
            KeywordRule { pattern: "ok".to_string(), category: IntentCategory::Positive, weight: 0.9 },
            KeywordRule { pattern: "sure".to_string(), category: IntentCategory::Positive, weight: 1.0 },
            KeywordRule { pattern: "agree".to_string(), category: IntentCategory::Positive, weight: 1.0 },
            KeywordRule { pattern: "great".to_string(), category: IntentCategory::Positive, weight: 0.8 },
            KeywordRule { pattern: "好的".to_string(), category: IntentCategory::Positive, weight: 1.0 },
            KeywordRule { pattern: "可以".to_string(), category: IntentCategory::Positive, weight: 1.0 },
            KeywordRule { pattern: "行".to_string(), category: IntentCategory::Positive, weight: 0.9 },
            
            // Negative
            KeywordRule { pattern: "no".to_string(), category: IntentCategory::Negative, weight: 1.0 },
            KeywordRule { pattern: "not interested".to_string(), category: IntentCategory::Negative, weight: 1.5 },
            KeywordRule { pattern: "no thanks".to_string(), category: IntentCategory::Negative, weight: 1.2 },
            KeywordRule { pattern: "不要".to_string(), category: IntentCategory::Negative, weight: 1.0 },
            KeywordRule { pattern: "不用".to_string(), category: IntentCategory::Negative, weight: 1.0 },
            KeywordRule { pattern: "不需要".to_string(), category: IntentCategory::Negative, weight: 1.2 },
            
            // Stop Request
            KeywordRule { pattern: "stop".to_string(), category: IntentCategory::StopRequest, weight: 1.5 },
            KeywordRule { pattern: "unsubscribe".to_string(), category: IntentCategory::StopRequest, weight: 2.0 },
            KeywordRule { pattern: "remove me".to_string(), category: IntentCategory::StopRequest, weight: 2.0 },
            KeywordRule { pattern: "取消".to_string(), category: IntentCategory::StopRequest, weight: 1.5 },
            KeywordRule { pattern: "退订".to_string(), category: IntentCategory::StopRequest, weight: 2.0 },
            
            // Question
            KeywordRule { pattern: "what".to_string(), category: IntentCategory::Question, weight: 0.8 },
            KeywordRule { pattern: "how".to_string(), category: IntentCategory::Question, weight: 0.8 },
            KeywordRule { pattern: "why".to_string(), category: IntentCategory::Question, weight: 0.8 },
            KeywordRule { pattern: "?".to_string(), category: IntentCategory::Question, weight: 0.5 },
            KeywordRule { pattern: "？".to_string(), category: IntentCategory::Question, weight: 0.5 },
            
            // Greeting
            KeywordRule { pattern: "hi".to_string(), category: IntentCategory::Greeting, weight: 0.9 },
            KeywordRule { pattern: "hello".to_string(), category: IntentCategory::Greeting, weight: 1.0 },
            KeywordRule { pattern: "hey".to_string(), category: IntentCategory::Greeting, weight: 0.8 },
            KeywordRule { pattern: "你好".to_string(), category: IntentCategory::Greeting, weight: 1.0 },
            
            // Urgency
            KeywordRule { pattern: "urgent".to_string(), category: IntentCategory::Urgency, weight: 1.5 },
            KeywordRule { pattern: "asap".to_string(), category: IntentCategory::Urgency, weight: 1.5 },
            KeywordRule { pattern: "immediately".to_string(), category: IntentCategory::Urgency, weight: 1.3 },
            KeywordRule { pattern: "紧急".to_string(), category: IntentCategory::Urgency, weight: 1.5 },
        ]
    }
}

impl Default for KeywordMatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_positive_intent() {
        let matcher = KeywordMatcher::new();
        
        let (intent, score) = matcher.classify("Yes, I'm interested!");
        assert_eq!(intent, IntentCategory::Positive);
        assert!(score > 0.0);
        
        let (intent, _) = matcher.classify("OK, sounds good");
        assert_eq!(intent, IntentCategory::Positive);
        
        println!("✅ Positive intent test passed");
    }

    #[test]
    fn test_negative_intent() {
        let matcher = KeywordMatcher::new();
        
        let (intent, _) = matcher.classify("No thanks, not interested");
        assert_eq!(intent, IntentCategory::Negative);
        
        let (intent, _) = matcher.classify("不需要，谢谢");
        assert_eq!(intent, IntentCategory::Negative);
        
        println!("✅ Negative intent test passed");
    }

    #[test]
    fn test_stop_request() {
        let matcher = KeywordMatcher::new();
        
        let (intent, score) = matcher.classify("Please STOP messaging me");
        assert_eq!(intent, IntentCategory::StopRequest);
        assert!(score >= 1.5);
        
        let (intent, _) = matcher.classify("unsubscribe");
        assert_eq!(intent, IntentCategory::StopRequest);
        
        println!("✅ Stop request test passed");
    }

    #[test]
    fn test_chinese_support() {
        let matcher = KeywordMatcher::new();
        
        // Test positive Chinese
        let (intent, _) = matcher.classify("好的，没问题");
        assert_eq!(intent, IntentCategory::Positive);
        
        // Test greeting Chinese (unambiguous)
        let (intent, _) = matcher.classify("你好");
        assert_eq!(intent, IntentCategory::Greeting);
        
        // Test stop request Chinese
        let (intent, _) = matcher.classify("请退订");
        assert_eq!(intent, IntentCategory::StopRequest);
        
        println!("✅ Chinese support test passed");
    }

    #[test]
    fn test_unknown_intent() {
        let matcher = KeywordMatcher::new();
        
        let (intent, score) = matcher.classify("The weather is nice today");
        assert_eq!(intent, IntentCategory::Unknown);
        assert_eq!(score, 0.0);
        
        println!("✅ Unknown intent test passed");
    }
}
