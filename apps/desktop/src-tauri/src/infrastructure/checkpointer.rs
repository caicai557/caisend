use crate::domain::ports::WorkflowRepositoryPort;
use crate::domain::workflow::instance::{InstanceStatus, WorkflowInstance};
use crate::error::CoreError;
use std::sync::Arc;
use std::panic::{self, AssertUnwindSafe};

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
        F: std::panic::UnwindSafe
            + FnOnce(Option<WorkflowInstance>) -> Result<(Option<WorkflowInstance>, T), CoreError>,
    {
        // 1. Load (Implicit Lock in SQLite for single writer, but here we rely on optimistic concurrency or serial execution)
        let current_state = self.repo.get_active_instance(contact_id).await?;

        // 2. Compute (Pure Domain Logic) with panic guard
        let logic_result = match panic::catch_unwind(AssertUnwindSafe(|| logic(current_state.clone()))) {
            Ok(res) => res,
            Err(_) => {
                if let Some(mut failed_instance) = current_state {
                    failed_instance.status = InstanceStatus::Failed.to_string();
                    let _ = self.repo.save_instance(&failed_instance).await;
                }
                return Err(CoreError::Poisoned("LVCP compute panic".to_string()));
            }
        };

        let (new_state, result) = logic_result?;

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
    use chrono::Utc;

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

        async fn preset(&self, instance: WorkflowInstance) {
            let mut lock = self.instance.lock().await;
            *lock = Some(instance);
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
                    status: InstanceStatus::Running.to_string(),
                    state_data: None,
                    next_execution_time: None,
                    current_pbt_instance_id: None,
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

    #[tokio::test]
    async fn test_checkpointer_marks_failed_on_panic() {
        let repo = Arc::new(MockRepo::new());
        let checkpointer = Checkpointer::new(repo.clone());

        // 预置运行中的实例
        let preset = WorkflowInstance {
            id: "inst_panic".to_string(),
            definition_id: "wf_1".to_string(),
            contact_id: "contact_panic".to_string(),
            current_node_id: Some("node_1".to_string()),
            status: InstanceStatus::Running.to_string(),
            state_data: None,
            next_execution_time: None,
            current_pbt_instance_id: None,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        repo.preset(preset).await;

        let result: Result<String, CoreError> = checkpointer
            .execute("contact_panic", |_current_state| {
                panic!("inject crash after lock");
            })
            .await;

        assert!(matches!(result, Err(CoreError::Poisoned(_))));

        let saved = repo.get_active_instance("contact_panic").await.unwrap();
        let status = saved.expect("instance should exist").status;
        assert_eq!(status, InstanceStatus::Failed.to_string());
    }

    #[tokio::test]
    async fn test_recovery_after_commit_before_execute() {
        let repo = Arc::new(MockRepo::new());
        let checkpointer = Checkpointer::new(repo.clone());

        // 第一次运行：Persist 完成但 Execute 未发生（模拟重启前状态）
        let result: Result<String, CoreError> = checkpointer
            .execute("contact_restart", |current_state| {
                assert!(current_state.is_none());
                let instance = WorkflowInstance {
                    id: "inst_restart".to_string(),
                    definition_id: "wf_1".to_string(),
                    contact_id: "contact_restart".to_string(),
                    current_node_id: Some("node_1".to_string()),
                    status: InstanceStatus::Running.to_string(),
                    state_data: None,
                    next_execution_time: None,
                    current_pbt_instance_id: None,
                    created_at: Utc::now().to_rfc3339(),
                    updated_at: Utc::now().to_rfc3339(),
                };
                Ok((Some(instance), "intent_pending".to_string()))
            })
            .await;

        assert_eq!(result.unwrap(), "intent_pending");

        // “重启”后再次执行应读取已持久化状态，且幂等
        let checkpointer_restart = Checkpointer::new(repo.clone());
        let result_restart: Result<String, CoreError> = checkpointer_restart
            .execute("contact_restart", |current_state| {
                let mut state = current_state.expect("state should persist from previous run");
                // 不改变状态，只返回相同意图，模拟幂等执行
                state.updated_at = Utc::now().to_rfc3339();
                Ok((Some(state), "intent_pending".to_string()))
            })
            .await;

        assert_eq!(result_restart.unwrap(), "intent_pending");

        let saved = repo.get_active_instance("contact_restart").await.unwrap();
        let inst = saved.expect("instance should persist after restart");
        assert_eq!(inst.current_node_id, Some("node_1".to_string()));
        assert_eq!(inst.status, InstanceStatus::Running.to_string());
    }
}
