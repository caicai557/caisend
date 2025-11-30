pub mod actuator;
pub mod actors;
pub mod adapters;
pub mod commands;
pub mod domain;
pub mod error;
pub mod managers;
pub mod state;
pub mod infrastructure;
pub mod ai; // Phase 4: Cognition

use adapters::browser::cdp_adapter::CdpManager;
use adapters::db::init_db;
use adapters::db::mvp_repo::MvpRepository;
use adapters::db::SqliteScriptRepository;  // 幽灵座舱
use infrastructure::ContextHub;  // 幽灵座舱中枢
use anyhow::Context;
use domain::automation::RuleEngine;
use crate::domain::workflow::engine::WorkflowEngine;
use crate::adapters::db::workflow_repo::WorkflowRepository;
use domain::events::AppEvent;
use domain::models::Message;
use state::{AppState, AppStore, Cold};
use std::collections::HashSet;
use std::sync::Arc;
use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> anyhow::Result<()> {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            println!("=== SETUP START ===");
            let _ = tauri::async_runtime::block_on(async {
                println!("=== ASYNC BLOCK START ===");
                println!("=== DB INIT START ===");
                let db_url = "sqlite://accounts.db";
                let db_pool = init_db(db_url)
                    .await
                    .context("Failed to initialize database")
                    .map_err(|e| {
                        eprintln!("Database initialization failed: {:?}", e);
                        e.to_string()
                    })?;
                println!("=== DB INIT SUCCESS ===");
                
                // Initialize AI Service
                let model_path = "models/bge-small-en-v1.5.onnx";
                let tokenizer_path = "models/tokenizer.json";
                match crate::ai::inference::CognitionService::new(model_path, tokenizer_path) {
                    Ok(service) => {
                        let cognition_arc = Arc::new(service);
                        
                        // 创建IntentClassifier并预加载意图模板
                        let mut intent_classifier = crate::ai::IntentClassifier::new(cognition_arc.clone());
                        
                        // 预加载常用意图模板
                        let _ = intent_classifier.add_intent_template("greeting", vec![
                            "你好", "hi", "hello", "早上好", "下午好", "晚上好"
                        ]);
                        let _ = intent_classifier.add_intent_template("farewell", vec![
                            "再见", "bye", "goodbye", "拜拜", "回见", "886"
                        ]);
                        let _ = intent_classifier.add_intent_template("question", vec![
                            "?", "？", "什么", "怎么", "how", "why", "when", "where", "who"
                        ]);
                        
                        // 注入到Tauri state
                        app.manage(cognition_arc);
                        app.manage(intent_classifier);
                        
                        println!("=== AI SERVICE INITIALIZED WITH INTENT CLASSIFIER ===");
                    }
                    Err(e) => {
                        println!("=== AI SERVICE FAILED TO INIT (Non-fatal): {} ===", e);
                    }
                }

                // Initialize CDP Manager
                let cdp_manager = CdpManager::new(app.handle().clone());
                app.manage(cdp_manager.clone()); 
                println!("=== CDP MANAGER CREATED ===");

                // Initialize Ghost Cockpit
                println!("=== INITIALIZING GHOST COCKPIT ===");
                let script_repo = Arc::new(SqliteScriptRepository::new(db_pool.clone()));
                let context_hub = Arc::new(ContextHub::new(
                    app.handle().clone(),
                    script_repo.clone(),
                ));
                app.manage(script_repo);
                app.manage(context_hub.clone());
                println!("=== GHOST COCKPIT READY ===");

                // Initialize PBT Repository
                let bt_repo = Arc::new(crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository::new(db_pool.clone()));
                app.manage(bt_repo.clone());

                // Initialize Workflow Engine
                let workflow_repo = Arc::new(WorkflowRepository::new(db_pool.clone()));
                let workflow_engine = Arc::new(WorkflowEngine::new(
                    app.handle().clone(),
                    workflow_repo.clone(),
                    bt_repo.clone(),
                ));
                app.manage(workflow_engine.clone());
                println!("=== WORKFLOW ENGINE STARTED ===");

                // Initialize System Supervisor
                let (supervisor, _) = ractor::Actor::spawn(
                    Some("system-supervisor".to_string()),
                    crate::actors::supervisor::SystemSupervisor,
                    (Arc::new(cdp_manager), bt_repo, app.handle().clone()),
                ).await.expect("Failed to start System Supervisor");
                app.manage(supervisor);
                println!("=== SYSTEM SUPERVISOR STARTED ===");

                println!("=== CREATING APP STORE ===");
                let cold_state = AppStore::<Cold>::new(db_pool.clone());
                println!("=== APP STORE CREATED ===");

                // Load rules
                println!("=== LOADING RULES ===");
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
                println!("=== MANAGING APP STATE ===");
                app.manage(app_state);
                println!("=== APP STATE MANAGED ===");

                // IPC Event Listener
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
                println!("=== EVENT LISTENER REGISTERED ===");
                
                Ok::<(), String>(())
            });
            println!("=== SETUP COMPLETE ===");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(true) = event {
                let label = window.label();
                
                if label != "hud_overlay" && label != "main" {
                    let account_id = if label.starts_with("account-") {
                        label.strip_prefix("account-").unwrap_or(label).to_string()
                    } else {
                        label.to_string()
                    };
                    
                    tracing::info!("[WindowFocus] Account window focused: {}", account_id);
                    
                    if let Some(hub) = window.try_state::<Arc<ContextHub>>() {
                        let hub = hub.inner().clone();
                        tauri::async_runtime::spawn(async move {
                            hub.update_active_account(account_id).await;
                        });
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::mvp_test::create_test_account,
            commands::mvp_test::create_test_rule,
            commands::mvp_test::test_automation,
            commands::workflow::save_workflow_definition,
            commands::workflow::get_workflow_definition,
            commands::workflow::list_active_instances,
            commands::workflow::validate_workflow,
            commands::workflow::save_workflow,
            commands::workflow::load_workflows,
            commands::workflow::delete_workflow,
            commands::workflow::toggle_workflow_active,
            commands::script::toggle_account_autoreply,
            commands::script::execute_and_advance_workflow,
            commands::script::get_account_flows,
            commands::script::notify_window_focus,
            commands::script::notify_peer_focus,
            commands::ghost_demo::ghost_cockpit_demo,
            commands::ghost_demo::list_all_flows,
            commands::ghost_demo::reset_demo_instance,
            commands::telegram_login::telegram_open_login,
            commands::telegram_login::telegram_input_phone,
            commands::telegram_login::telegram_check_code_status,
            commands::pbt::create_pbt_definition,
            commands::pbt::list_pbt_definitions,
            commands::pbt::create_pbt_instance,
            commands::pbt::get_pbt_instance_status,
            commands::pbt::trigger_pbt_tick,
            commands::pbt::get_active_pbt_instance,
            commands::pbt::create_simple_test_definition,
            commands::pbt::load_pbt_from_file,
            commands::pbt::load_and_execute_pbt,
            commands::dashboard::get_system_status,
        ])
        .run(tauri::generate_context!())
        .context("Error while running Tauri application")?;
    
    Ok(())
}
