//! Intent Classifier - Multi-layer classification engine
//!
//! Layer 1: Keyword matching (Aho-Corasick) - <1ms
//! Layer 2: Regex patterns - <5ms
//! Layer 3: (Future) ONNX embedding similarity - ~20ms

use regex::Regex;
use std::collections::HashMap;
use tracing::debug;

use super::keywords::{IntentCategory, KeywordMatcher};

/// Classification result with confidence
#[derive(Debug, Clone)]
pub struct ClassificationResult {
    pub category: IntentCategory,
    pub confidence: f32,
    pub layer: ClassificationLayer,
}

/// Which layer made the classification
#[derive(Debug, Clone, PartialEq)]
pub enum ClassificationLayer {
    Keyword,
    Pattern,
    Semantic,
}

/// Pattern rule for regex-based matching
pub struct PatternRule {
    pub regex: Regex,
    pub category: IntentCategory,
    pub weight: f32,
}

/// The main Intent Classifier
pub struct IntentClassifier {
    keyword_matcher: KeywordMatcher,
    pattern_rules: Vec<PatternRule>,
    /// Minimum confidence threshold for keyword layer
    keyword_threshold: f32,
}

impl IntentClassifier {
    /// Create a new classifier with default configuration
    pub fn new() -> Self {
        Self {
            keyword_matcher: KeywordMatcher::new(),
            pattern_rules: Self::default_patterns(),
            keyword_threshold: 0.8,
        }
    }

    /// Classify the input text
    /// 
    /// Uses a layered approach:
    /// 1. Try fast keyword matching first
    /// 2. If confidence is low, try regex patterns
    /// 3. (Future) If still uncertain, use semantic matching
    pub fn classify(&self, text: &str) -> ClassificationResult {
        // Layer 1: Keyword matching
        let (keyword_cat, keyword_score) = self.keyword_matcher.classify(text);
        
        if keyword_cat != IntentCategory::Unknown && keyword_score >= self.keyword_threshold {
            debug!("Classified by keyword layer: {:?} ({})", keyword_cat, keyword_score);
            return ClassificationResult {
                category: keyword_cat,
                confidence: (keyword_score / 2.0).min(1.0), // Normalize to 0-1
                layer: ClassificationLayer::Keyword,
            };
        }

        // Layer 2: Pattern matching
        let pattern_result = self.match_patterns(text);
        if let Some((cat, score)) = pattern_result {
            debug!("Classified by pattern layer: {:?} ({})", cat, score);
            return ClassificationResult {
                category: cat,
                confidence: score,
                layer: ClassificationLayer::Pattern,
            };
        }

        // Fallback: Return keyword result even if below threshold
        if keyword_cat != IntentCategory::Unknown {
            return ClassificationResult {
                category: keyword_cat,
                confidence: (keyword_score / 3.0).min(0.5), // Low confidence
                layer: ClassificationLayer::Keyword,
            };
        }

        // Unknown
        ClassificationResult {
            category: IntentCategory::Unknown,
            confidence: 0.0,
            layer: ClassificationLayer::Keyword,
        }
    }

    /// Match against regex patterns
    fn match_patterns(&self, text: &str) -> Option<(IntentCategory, f32)> {
        let mut scores: HashMap<IntentCategory, f32> = HashMap::new();
        
        for rule in &self.pattern_rules {
            if rule.regex.is_match(text) {
                *scores.entry(rule.category.clone()).or_insert(0.0) += rule.weight;
            }
        }

        scores
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .filter(|(_, score)| *score >= 0.5)
    }

    /// Default regex patterns
    fn default_patterns() -> Vec<PatternRule> {
        vec![
            // Question patterns
            PatternRule {
                regex: Regex::new(r"(?i)^(what|how|why|when|where|who|which)\b").unwrap(),
                category: IntentCategory::Question,
                weight: 0.9,
            },
            PatternRule {
                regex: Regex::new(r"\?$").unwrap(),
                category: IntentCategory::Question,
                weight: 0.6,
            },
            // Price inquiry
            PatternRule {
                regex: Regex::new(r"(?i)(price|cost|how much|pricing)").unwrap(),
                category: IntentCategory::Question,
                weight: 0.8,
            },
            // Affirmative responses
            PatternRule {
                regex: Regex::new(r"(?i)^(yep|yeah|yup|definitely|absolutely)\b").unwrap(),
                category: IntentCategory::Positive,
                weight: 1.0,
            },
            // Negative responses
            PatternRule {
                regex: Regex::new(r"(?i)^(nope|nah|never|don't|won't)\b").unwrap(),
                category: IntentCategory::Negative,
                weight: 1.0,
            },
            // Chinese patterns
            PatternRule {
                regex: Regex::new(r"多少钱|价格|怎么卖").unwrap(),
                category: IntentCategory::Question,
                weight: 0.9,
            },
            PatternRule {
                regex: Regex::new(r"^(嗯|对|是的|当然)").unwrap(),
                category: IntentCategory::Positive,
                weight: 0.9,
            },
        ]
    }
}

impl Default for IntentClassifier {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layered_classification() {
        let classifier = IntentClassifier::new();
        
        // Keyword layer should catch this
        let result = classifier.classify("Yes, definitely interested!");
        assert_eq!(result.category, IntentCategory::Positive);
        assert_eq!(result.layer, ClassificationLayer::Keyword);
        
        println!("✅ Layered classification test passed");
    }

    #[test]
    fn test_pattern_fallback() {
        let classifier = IntentClassifier::new();
        
        // Pattern layer should catch this
        let result = classifier.classify("Yep, sounds good to me");
        assert_eq!(result.category, IntentCategory::Positive);
        
        println!("✅ Pattern fallback test passed");
    }

    #[test]
    fn test_question_detection() {
        let classifier = IntentClassifier::new();
        
        let result = classifier.classify("How much does it cost?");
        assert_eq!(result.category, IntentCategory::Question);
        
        let result = classifier.classify("What's this about?");
        assert_eq!(result.category, IntentCategory::Question);
        
        println!("✅ Question detection test passed");
    }

    #[test]
    fn test_confidence_levels() {
        let classifier = IntentClassifier::new();
        
        // High confidence - direct keyword
        let result = classifier.classify("STOP");
        assert!(result.confidence > 0.5);
        
        // Lower confidence - no match
        let result = classifier.classify("Random text here");
        assert!(result.confidence < 0.1);
        
        println!("✅ Confidence levels test passed");
    }

    #[test]
    fn test_chinese_patterns() {
        let classifier = IntentClassifier::new();
        
        let result = classifier.classify("这个多少钱？");
        assert_eq!(result.category, IntentCategory::Question);
        
        let result = classifier.classify("嗯，好的");
        // Could be positive from either keyword or pattern
        assert!(result.category == IntentCategory::Positive || result.category == IntentCategory::Greeting);
        
        println!("✅ Chinese patterns test passed");
    }
}
