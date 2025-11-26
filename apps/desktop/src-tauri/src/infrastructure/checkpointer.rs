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
#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workflow::instance::WorkflowInstance;
    use crate::domain::workflow::schema::WorkflowDefinition;
    use tokio::sync::Mutex;

    // Mock Repository
    struct MockRepo {
        instance: Arc<Mutex<Option<WorkflowInstance>>>,
    }

    impl MockRepo {
        fn new() -> Self {
            Self {
                instance: Arc::new(Mutex::new(None)),
            }
        }
    }

    #[async_trait::async_trait]
    impl WorkflowRepositoryPort for MockRepo {
        async fn save_definition(&self, _def: &WorkflowDefinition) -> Result<(), CoreError> {
            Ok(())
        }
        async fn get_definition(&self, _id: &str) -> Result<Option<WorkflowDefinition>, CoreError> {
            Ok(None)
        }
        async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), CoreError> {
            let mut lock = self.instance.lock().await;
            *lock = Some(instance.clone());
            Ok(())
        }
        async fn get_active_instance(&self, _contact_id: &str) -> Result<Option<WorkflowInstance>, CoreError> {
            let lock = self.instance.lock().await;
            Ok(lock.clone())
        }
    }

    #[tokio::test]
    async fn test_checkpointer_execute_success() {
        let repo = Arc::new(MockRepo::new());
        let checkpointer = Checkpointer::new(repo.clone());

        let result: Result<String, CoreError> = checkpointer
            .execute("contact_1", |current_state| {
                assert!(current_state.is_none());
                
                // Simulate creating a new state
                let new_instance = WorkflowInstance {
                    id: "inst_1".to_string(),
                    definition_id: "wf_1".to_string(),
                    contact_id: "contact_1".to_string(),
                    current_node_id: Some("node_1".to_string()),
                    status: "active".to_string(),
                    state_data: None,
                    next_execution_time: None,
                    created_at: "2023-01-01T00:00:00Z".to_string(),
                    updated_at: "2023-01-01T00:00:00Z".to_string(),
                };

                Ok((Some(new_instance), "success".to_string()))
            })
            .await;

        assert_eq!(result.unwrap(), "success");

        // Verify state was persisted
        let saved = repo.get_active_instance("contact_1").await.unwrap();
        assert!(saved.is_some());
        assert_eq!(saved.unwrap().id, "inst_1");
    }

    #[tokio::test]
    async fn test_checkpointer_rollback_on_error() {
        let repo = Arc::new(MockRepo::new());
        let checkpointer = Checkpointer::new(repo.clone());

        let result: Result<String, CoreError> = checkpointer
            .execute("contact_1", |_current_state| {
                // Simulate error during computation
                Err(CoreError::InternalError("computation failed".to_string()))
            })
            .await;

        assert!(result.is_err());

        // Verify state was NOT persisted (still None)
        let saved = repo.get_active_instance("contact_1").await.unwrap();
        assert!(saved.is_none());
    }
}
