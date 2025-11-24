pub mod adapters;
pub mod commands;
pub mod domain;
pub mod error;
pub mod state;
pub mod managers;
pub mod actuator;

use state::AppState;
use adapters::db::init_db;
use domain::automation::RuleEngine;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let db_url = "sqlite://accounts.db";
                let db_pool = init_db(db_url).await.expect("Failed to initialize database");
                let app_state = AppState::new(db_pool);
                /*
                let app_state_arc = Arc::new(AppState {
                    db_pool: app_state.db_pool.clone(),
                    connection_manager: app_state.connection_manager.clone(),
                    event_bus: app_state.event_bus.clone(),
                    rule_cache: app_state.rule_cache.clone(),
                });
                
                // Initialize Workflow Components
                let wf_repo = Arc::new(adapters::db::workflow_repo::WorkflowRepository::new(app_state.db_pool.clone()));
                let wf_tracker = Arc::new(domain::workflow::tracker::InstanceStateTracker::new(wf_repo.clone()));
                let wf_engine = Arc::new(domain::workflow::engine::WorkflowEngine::new(wf_tracker, wf_repo, app_state_arc.clone()));

                // Initialize Rule Engine
                let rule_engine = Arc::new(tokio::sync::RwLock::new(
                    RuleEngine::new(app_state_arc.clone(), wf_engine.clone())
                ));
                
                // Initialize Orchestrator
                let orchestrator = domain::automation::orchestrator::AutomationOrchestrator::new(
                    rule_engine.clone(),
                    wf_engine.clone(),
                    app_state_arc.clone()
                );
                orchestrator.start().await;

                // Initialize Scheduler
                let scheduler = domain::workflow::scheduler::WorkflowScheduler::new(app_state_arc.clone());
                scheduler.start().await;
                */
                
                app.manage(app_state);
                
                // MVP-T4: IPC Event Listener
                let handle = app.handle().clone();
                app.listen("automation_event", move |event| {
                    if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
                        println!("Received automation event: {:?}", payload);
                        // Parse and publish to event bus
                        // This requires async context or blocking send if bus is sync.
                        // broadcast::Sender::send is sync.
                        
                        // We need to access state.
                        // Since we are in a closure, we need to capture state.
                        // But app.listen closure is 'static + Send.
                        
                        // Simplified: Just log for now, or use handle.state::<AppState>()
                        if let Some(state) = handle.try_state::<AppState>() {
                             // Logic to parse payload and send AppEvent
                             // For MVP, we just log.
                             // In real implementation, we would map JSON to AppEvent
                        }
                    }
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::mvp_test::create_test_account,
            commands::mvp_test::create_test_rule,
            commands::mvp_test::test_automation,
            /*
            commands::account::create_account,
            commands::account::list_accounts,
            commands::auth::start_session,
            commands::messaging::send_message,
            commands::crm::update_contact,
            commands::crm::get_contact,
            commands::analytics::get_dashboard_stats,
            commands::workflow::save_workflow_definition,
            commands::workflow::get_workflow_definition,
            commands::workflow::list_active_instances
            */
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
