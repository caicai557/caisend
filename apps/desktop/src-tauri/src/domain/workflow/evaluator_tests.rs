#[cfg(test)]
mod tests {
    use crate::domain::workflow::evaluator::evaluate_condition;
    use crate::domain::workflow::schema::{Condition, MatchType};

    #[tokio::test]
    async fn test_keyword_match_success() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("hello".to_string()),
            ..Default::default()
        };
        let result = evaluate_condition("Hello world", &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_keyword_match_failure() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("bye".to_string()),
            ..Default::default()
        };
        let result = evaluate_condition("Hello world", &condition, None, None).await;
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_regex_match_success() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"^\d{3}$".to_string()),
            ..Default::default()
        };
        let result = evaluate_condition("123", &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_regex_match_failure() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"^\d{3}$".to_string()),
            ..Default::default()
        };
        let result = evaluate_condition("12a", &condition, None, None).await;
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_regex_invalid_pattern() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"[".to_string()), // Invalid regex
            ..Default::default()
        };
        let result = evaluate_condition("test", &condition, None, None).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fallback_always_true() {
        let condition = Condition {
            match_type: MatchType::Fallback,
            pattern: None,
            ..Default::default()
        };
        let result = evaluate_condition("anything", &condition, None, None).await;
        assert!(result.unwrap());
    }

    // Mock semantic test (since we don't have real AI service in unit tests easily)
    // We rely on the mock implementation in evaluator.rs which checks if input contains pattern
    #[tokio::test]
    async fn test_semantic_match_mock() {
        // We need to pass Some(CognitionService) and Some(Pool) to trigger the logic, 
        // but since we can't easily construct them without mocking the structs themselves (which might be hard if they are concrete),
        // we might need to refactor evaluator to take a trait or just test the "missing dependency" path for now if structs are hard to instantiate.
        
        // Actually, the current implementation checks `(Some(_cognition), Some(_pool))`.
        // If we pass None, it returns false with a warning.
        let condition = Condition {
            match_type: MatchType::Semantic,
            pattern: Some("intent".to_string()),
            ..Default::default()
        };
        let result = evaluate_condition("input with intent", &condition, None, None).await;
        // Should return false because dependencies are missing
        assert!(!result.unwrap());
    }

    // === 边界测试 (Boundary Tests) ===

    #[tokio::test]
    async fn test_keyword_empty_string() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("test".to_string()),
        };
        let result = evaluate_condition("", &condition, None, None).await;
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_keyword_empty_pattern() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("".to_string()),
        };
        // Empty pattern should match any string (since all strings contain "")
        let result = evaluate_condition("any text", &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_keyword_special_characters() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("'$%^&*()".to_string()),
        };
        let result = evaluate_condition("text with '$%^&*()' special chars", &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_keyword_unicode() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("你好".to_string()),
        };
        let result = evaluate_condition("你好世界", &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_keyword_case_insensitive() {
        let condition = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("HELLO".to_string()),
        };
        let result = evaluate_condition("hello world", &condition, None, None).await;
        assert!(result.unwrap(), "Keyword match should be case-insensitive");
    }

    #[tokio::test]
    async fn test_regex_empty_string() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"^\d+$".to_string()),
        };
        let result = evaluate_condition("", &condition, None, None).await;
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_regex_very_long_string() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"^a+$".to_string()),
        };
        let long_string = "a".repeat(10000);
        let result = evaluate_condition(&long_string, &condition, None, None).await;
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn test_regex_missing_pattern() {
        let condition = Condition {
            match_type: MatchType::Regex,
            pattern: None,
        };
        let result = evaluate_condition("test", &condition, None, None).await;
        assert!(result.is_err(), "Missing regex pattern should return error");
    }

    #[tokio::test]
    async fn test_timeout_always_false() {
        let condition = Condition {
            match_type: MatchType::Timeout,
            pattern: None,
        };
        let result = evaluate_condition("anything", &condition, None, None).await;
        assert!(!result.unwrap(), "Timeout should always return false without timer support");
    }

    #[tokio::test]
    async fn test_semantic_missing_dependencies() {
        let condition = Condition {
            match_type: MatchType::Semantic,
            pattern: Some("test_intent".to_string()),
        };
        // Without cognition service and pool, should return false
        let result = evaluate_condition("test message", &condition, None, None).await;
        assert!(!result.unwrap());
    }
}
