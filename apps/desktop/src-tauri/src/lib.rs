pub mod actuator;
pub mod adapters;
pub mod commands;
pub mod domain;
pub mod error;
pub mod managers;
pub mod state;

use actuator::scheduler::FocusScheduler;
use adapters::db::init_db;
use adapters::db::mvp_repo::MvpRepository;
use domain::automation::RuleEngine;
use domain::events::AppEvent;
use domain::models::Message;
use state::{AppState, AppStore, Cold};
use std::collections::HashSet;
use std::sync::Arc;
use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let db_url = "sqlite://accounts.db";
                let db_pool = init_db(db_url)
                    .await
                    .expect("Failed to initialize database");
                let scheduler = FocusScheduler::new(app.handle().clone());
                let cold_state = AppStore::<Cold>::new(db_pool, scheduler);
                /*
                // Workflow/bootstrap code can take AppHandle::state::<AppState>()
                // to avoid wrapping the state in Arc. Example:
                // let wf_repo = adapters::db::workflow_repo::WorkflowRepository::new(cold_state.pool().clone());
                // let wf_tracker = domain::workflow::tracker::InstanceStateTracker::new(Arc::new(wf_repo));
                // let wf_engine = domain::workflow::engine::WorkflowEngine::new(wf_tracker, wf_repo, app.handle().clone());
                 */

                // Load rules into cache
                let repo = MvpRepository::new(cold_state.pool().clone());
                let rule_seed = match repo.get_all_rules().await {
                    Ok(rules) => rules,
                    Err(err) => {
                        println!("Failed to load rules from database: {err}");
                        Vec::new()
                    }
                };
                let rule_total = rule_seed.len();
                let rule_accounts = rule_seed
                    .iter()
                    .filter_map(|rule| rule.account_id.as_ref())
                    .collect::<HashSet<_>>()
                    .len();
                let app_state = cold_state.with_rule_cache(rule_seed);

                println!("Loaded {rule_total} rules into cache for {rule_accounts} account(s)");

                app.manage(app_state);

                // IPC Event Listener -> EventBus + RuleEngine
                let handle = app.handle().clone();
                let rule_engine = Arc::new(RuleEngine::new(handle.clone()));
                app.listen("automation_event", move |event| {
                    let payload_raw = event.payload();
                    let state = match handle.try_state::<AppState>() {
                        Some(s) => s,
                        None => return,
                    };

                    #[derive(serde::Deserialize, Debug)]
                    struct AutomationPayload {
                        #[serde(rename = "eventType")]
                        event_type: String,
                        #[serde(default)]
                        payload: serde_json::Value,
                    }

                    let parsed: AutomationPayload = match serde_json::from_str(payload_raw) {
                        Ok(p) => p,
                        Err(err) => {
                            println!("automation_event parse failed: {err}");
                            return;
                        }
                    };

                    // account_id: prefer payload.account_id, fallback to default
                    let account_id = parsed
                        .payload
                        .get("account_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("default")
                        .to_string();

                    match parsed.event_type.as_str() {
                        "NewMessage" => {
                            let content = parsed
                                .payload
                                .get("content")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let chat_id = parsed
                                .payload
                                .get("chat_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or(&account_id)
                                .to_string();
                            let sender = parsed
                                .payload
                                .get("sender")
                                .and_then(|v| v.as_str())
                                .unwrap_or("remote")
                                .to_string();

                            let message = Message {
                                id: uuid::Uuid::new_v4().to_string(),
                                conversation_id: chat_id.clone(),
                                sender_id: sender,
                                content: content.clone(),
                                message_type: "text".to_string(),
                                status: "received".to_string(),
                                created_at: chrono::Utc::now().to_rfc3339(),
                            };

                            let _ = state
                                .event_sender()
                                .send(AppEvent::NewMessageReceived(message));

                            // Fire rule engine with account_id
                            let re = rule_engine.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = re.evaluate_message(&content, &account_id).await;
                            });
                        }
                        "InviteLinkFound" => {
                            let link = parsed
                                .payload
                                .get("link")
                                .and_then(|v| v.as_str())
                                .unwrap_or_default()
                                .to_string();
                            let _ = state
                                .event_sender()
                                .send(AppEvent::InviteLinkFound { link });
                        }
                        "UnreadChatDetected" => {
                            let chat_id = parsed
                                .payload
                                .get("chat_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or_default()
                                .to_string();
                            let _ = state
                                .event_sender()
                                .send(AppEvent::UnreadChatDetected { chat_id });
                        }
                        other => {
                            println!("automation_event ignored type: {}", other);
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
