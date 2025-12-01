pub mod schema;
pub mod state;
pub mod engine;

#[cfg(test)]
mod engine_tests;

// Re-export common types
pub use schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
pub use state::{BehaviorTreeInstance, NodeStatus, Blackboard};

#[cfg(test)]
mod tests;
