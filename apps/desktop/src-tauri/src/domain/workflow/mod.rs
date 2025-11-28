pub mod schema;  // Phase 3.1: Workflow DSL
pub mod evaluator; // Phase 3.2: Judgment Logic
pub mod validator; // Phase 3.3: Workflow Validation
pub mod instance;
pub mod evaluator_tests;
pub mod tracker;
pub mod engine;
pub mod scheduler;
pub mod models;
pub mod script;  // 新增：线性脚本DSL

#[cfg(test)]
pub mod engine_tests;

// 新增：集成测试
#[cfg(test)]
pub mod integration_tests;

// 公开导出核心类型
pub use script::{ScriptFlow, ScriptStep, ScriptInstance, AdvanceMode, AccountConfig};

#[cfg(test)]
pub mod tests;
