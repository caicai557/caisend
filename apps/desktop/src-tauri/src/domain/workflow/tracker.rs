use crate::domain::workflow::instance::WorkflowInstance;
use crate::adapters::db::workflow_repo::WorkflowRepository;
use crate::error::CoreError;
use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;

pub struct InstanceStateTracker {
    repo: Arc<WorkflowRepository>,
    cache: Cache<String, WorkflowInstance>, // Key: contact_id
}

impl InstanceStateTracker {
    pub fn new(repo: Arc<WorkflowRepository>) -> Self {
        Self {
            repo,
            cache: Cache::builder()
                .max_capacity(1000)
                .time_to_live(Duration::from_secs(3600)) // 1 hour TTL
                .build(),
        }
    }

    pub async fn get_active_instance(&self, contact_id: &str) -> Result<Option<WorkflowInstance>, CoreError> {
        // L1 Cache
        if let Some(instance) = self.cache.get(contact_id).await {
            return Ok(Some(instance));
        }

        // L2 DB
        if let Some(instance) = self.repo.get_active_instance(contact_id).await? {
            // Populate L1
            self.cache.insert(contact_id.to_string(), instance.clone()).await;
            return Ok(Some(instance));
        }

        Ok(None)
    }

    pub async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), CoreError> {
        // Write-through: Save to DB then update Cache
        self.repo.save_instance(instance).await?;
        self.cache.insert(instance.contact_id.clone(), instance.clone()).await;
        Ok(())
    }
    
    pub async fn invalidate(&self, contact_id: &str) {
        self.cache.invalidate(contact_id).await;
    }
}
