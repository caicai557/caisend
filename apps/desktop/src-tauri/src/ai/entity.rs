use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Entity {
    pub label: String,
    pub value: String,
    pub start: usize,
    pub end: usize,
    pub confidence: f32,
}

impl Entity {
    pub fn new(label: &str, value: &str, start: usize, end: usize, confidence: f32) -> Self {
        Self {
            label: label.to_string(),
            value: value.to_string(),
            start,
            end,
            confidence,
        }
    }
}
