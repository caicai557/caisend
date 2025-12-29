//! Teleflow Tauri Application
//!
//! This is the main library that provides IPC commands for the frontend.

use serde::{Deserialize, Serialize};
use tracing::info;

// Re-export core types
pub use teleflow_core::intelligence::keywords::IntentCategory;

/// System status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub actors_online: bool,
    pub persistence_ready: bool,
    pub perception_ready: bool,
    pub intelligence_ready: bool,
    pub accounts_count: usize,
}

/// Account info for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub id: String,
    pub name: String,
    pub status: String,
}

/// Workflow node for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub name: String,
    pub status: String,
    pub scripts_count: usize,
}

/// IPC Commands module
mod commands {
    use super::*;
    
    /// IPC: Get system status
    #[tauri::command]
    pub fn get_system_status() -> SystemStatus {
        info!("📊 IPC: get_system_status called");
        SystemStatus {
            actors_online: true,
            persistence_ready: true,
            perception_ready: true,
            intelligence_ready: true,
            accounts_count: 2,
        }
    }

    /// IPC: Get all accounts
    #[tauri::command]
    pub fn get_accounts() -> Vec<AccountInfo> {
        info!("👥 IPC: get_accounts called");
        vec![
            AccountInfo {
                id: "1".to_string(),
                name: "@user1".to_string(),
                status: "online".to_string(),
            },
            AccountInfo {
                id: "2".to_string(),
                name: "@user2".to_string(),
                status: "offline".to_string(),
            },
        ]
    }

    /// IPC: Get workflow nodes for current flow
    #[tauri::command]
    pub fn get_workflow_nodes() -> Vec<WorkflowNode> {
        info!("📋 IPC: get_workflow_nodes called");
        vec![
            WorkflowNode {
                id: "1".to_string(),
                name: "打招呼".to_string(),
                status: "completed".to_string(),
                scripts_count: 3,
            },
            WorkflowNode {
                id: "2".to_string(),
                name: "介绍产品".to_string(),
                status: "current".to_string(),
                scripts_count: 5,
            },
            WorkflowNode {
                id: "3".to_string(),
                name: "处理异议".to_string(),
                status: "pending".to_string(),
                scripts_count: 4,
            },
            WorkflowNode {
                id: "4".to_string(),
                name: "成交".to_string(),
                status: "pending".to_string(),
                scripts_count: 2,
            },
        ]
    }

    /// IPC: Classify intent of a message
    #[tauri::command]
    pub fn classify_intent(message: String) -> String {
        info!("🧠 IPC: classify_intent called with: {}", message);
        
        use teleflow_core::intelligence::intent::IntentClassifier;
        
        let classifier = IntentClassifier::new();
        let result = classifier.classify(&message);
        
        format!("{:?} (confidence: {:.2})", result.category, result.confidence)
    }

    /// IPC: Start workflow for an account
    #[tauri::command]
    pub fn start_workflow(account_id: String, workflow_id: String) -> Result<String, String> {
        info!("▶️ IPC: start_workflow called for account: {}, workflow: {}", account_id, workflow_id);
        Ok(format!("Started workflow {} for account {}", workflow_id, account_id))
    }

    /// IPC: Stop workflow for an account
    #[tauri::command]
    pub fn stop_workflow(account_id: String) -> Result<String, String> {
        info!("⏹️ IPC: stop_workflow called for account: {}", account_id);
        Ok(format!("Stopped workflow for account {}", account_id))
    }
}

/// Initialize logging
pub fn init_logging() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .try_init()
        .ok();
}

/// Run the Tauri application
pub fn run() {
    init_logging();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_system_status,
            commands::get_accounts,
            commands::get_workflow_nodes,
            commands::classify_intent,
            commands::start_workflow,
            commands::stop_workflow,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::commands::*;

    #[test]
    fn test_get_system_status() {
        let status = get_system_status();
        assert!(status.actors_online);
        assert!(status.persistence_ready);
    }

    #[test]
    fn test_get_accounts() {
        let accounts = get_accounts();
        assert_eq!(accounts.len(), 2);
        assert_eq!(accounts[0].name, "@user1");
    }

    #[test]
    fn test_classify_intent() {
        let result = classify_intent("Yes, I'm interested!".to_string());
        assert!(result.contains("Positive"));
    }
}
