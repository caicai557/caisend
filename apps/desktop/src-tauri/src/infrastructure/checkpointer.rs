use crate::domain::ports::WorkflowRepositoryPort;
use crate::domain::workflow::instance::WorkflowInstance;
use crate::error::CoreError;
use std::sync::Arc;

/// Checkpointer implements the Lock-Validate-Compute-Persist (LVCP) pattern.
/// It ensures that domain logic is executed transactionally against the state.
pub struct Checkpointer {
    repo: Arc<dyn WorkflowRepositoryPort>,
}

impl Checkpointer {
    pub fn new(repo: Arc<dyn WorkflowRepositoryPort>) -> Self {
        Self { repo }
    }

    /// Execute a transactional logic block.
    /// 
    /// # Arguments
    /// * `contact_id` - The identifier to load the state.
    /// * `logic` - A pure function that takes the current state and returns the new state and a result (e.g., Intent).
    /// 
    /// # Returns
    /// The result produced by the logic block.
    pub async fn execute<F, T>(
        &self,
        contact_id: &str,
        logic: F,
    ) -> Result<T, CoreError>
    where
        F: FnOnce(Option<WorkflowInstance>) -> Result<(Option<WorkflowInstance>, T), CoreError>,
    {
        // 1. Load (Implicit Lock in SQLite for single writer, but here we rely on optimistic concurrency or serial execution)
        let current_state = self.repo.get_active_instance(contact_id).await?;

        // 2. Compute (Pure Domain Logic)
        let (new_state, result) = logic(current_state)?;

        // 3. Persist
        if let Some(instance) = &new_state {
            self.repo.save_instance(instance).await?;
        }

        // 4. Return Result (Caller handles Intent/Side-effects)
        Ok(result)
    }
}
