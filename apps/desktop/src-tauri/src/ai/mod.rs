pub mod inference;
pub mod intent;
pub mod intent_classifier;
pub mod intent_templates;

pub use intent::{IntentResult, intents};
pub use intent_classifier::IntentClassifier;
pub use intent_templates::load_default_templates;
