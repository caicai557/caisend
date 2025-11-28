pub mod inference;
pub mod intent;
pub mod intent_classifier;

pub use intent::{IntentResult, intents};
pub use intent_classifier::IntentClassifier;
