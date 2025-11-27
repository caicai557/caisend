pub mod script_manager;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerceptionLevel {
    L1Fiber,
    L2DOM,
    L3Visual,
}

pub trait PerceptionEngine {
    fn get_perception_level(&self) -> PerceptionLevel;
}
