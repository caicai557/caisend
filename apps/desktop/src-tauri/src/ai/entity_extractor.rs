use super::entity::Entity;
use anyhow::Result;
use regex::Regex;
use std::collections::HashMap;

pub struct EntityExtractor {
    patterns: HashMap<String, Regex>,
}

impl EntityExtractor {
    pub fn new() -> Self {
        Self {
            patterns: HashMap::new(),
        }
    }

    pub fn add_pattern(&mut self, label: &str, pattern: &str) -> Result<()> {
        let regex = Regex::new(pattern)?;
        self.patterns.insert(label.to_string(), regex);
        Ok(())
    }

    pub fn extract(&self, text: &str) -> Vec<Entity> {
        let mut entities = Vec::new();

        for (label, regex) in &self.patterns {
            for cap in regex.captures_iter(text) {
                if let Some(match_) = cap.get(0) { // Use full match or specific group? Let's use full match for now
                    // If there is a capture group 1, use that as value, otherwise use full match
                    let (value, start, end) = if let Some(group) = cap.get(1) {
                        (group.as_str(), group.start(), group.end())
                    } else {
                        (match_.as_str(), match_.start(), match_.end())
                    };

                    entities.push(Entity::new(
                        label,
                        value,
                        start,
                        end,
                        1.0, // Regex match is high confidence
                    ));
                }
            }
        }

        // Sort by start position
        entities.sort_by_key(|e| e.start);
        entities
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_entities() {
        let mut extractor = EntityExtractor::new();
        extractor.add_pattern("email", r"[\w\.-]+@[\w\.-]+\.\w+").unwrap();
        extractor.add_pattern("amount", r"(\d+)\s*USD").unwrap();

        let text = "Send 100 USD to alice@example.com";
        let entities = extractor.extract(text);

        assert_eq!(entities.len(), 2);
        
        let amount = &entities[0];
        assert_eq!(amount.label, "amount");
        assert_eq!(amount.value, "100"); // Group 1 capture
        
        let email = &entities[1];
        assert_eq!(email.label, "email");
        assert_eq!(email.value, "alice@example.com");
    }
}
