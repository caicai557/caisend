use crate::domain::message::Message;
use crate::domain::rule::{Action, Condition, Operator, Rule, TriggerType};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct RuleEngine {
    rules: Arc<RwLock<Vec<Rule>>>,
}

impl RuleEngine {
    pub fn new() -> Self {
        Self {
            rules: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn add_rule(&self, rule: Rule) {
        let mut rules = self.rules.write().await;
        rules.push(rule);
    }

    pub async fn evaluate(&self, message: &Message) -> Vec<Action> {
        let rules = self.rules.read().await;
        let mut actions = Vec::new();

        for rule in rules.iter() {
            if !rule.enabled {
                continue;
            }

            // Check trigger type
            match rule.trigger_type {
                TriggerType::MessageReceived => {
                    // Continue evaluation
                }
                // Handle other triggers
            }

            if self.matches_conditions(rule, message) {
                actions.extend(rule.actions.clone());
            }
        }

        actions
    }

    fn matches_conditions(&self, rule: &Rule, message: &Message) -> bool {
        if rule.conditions.is_empty() {
            return true;
        }

        for condition in &rule.conditions {
            if !self.check_condition(condition, message) {
                return false;
            }
        }

        true
    }

    fn check_condition(&self, condition: &Condition, message: &Message) -> bool {
        match condition.field.as_str() {
            "content" => self.match_string(&message.content, condition),
            "external_id" => {
                if let Some(ref ext_id) = message.external_id {
                    self.match_string(ext_id, condition)
                } else {
                    false
                }
            }
            _ => false, // Unknown field
        }
    }

    fn match_string(&self, value: &str, condition: &Condition) -> bool {
        match condition.operator {
            Operator::Contains => value.contains(&condition.value),
            Operator::Equals => value == &condition.value,
            Operator::StartsWith => value.starts_with(&condition.value),
            Operator::EndsWith => value.ends_with(&condition.value),
            Operator::Regex => {
                // TODO: Implement regex matching
                // For now, fallback to contains
                value.contains(&condition.value)
            }
        }
    }
}
