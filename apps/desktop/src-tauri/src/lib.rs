pub mod adapters;
pub mod domain;
pub mod commands;
pub mod state;
pub mod events;
pub mod services;

use crate::state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle();
            let handle_clone = handle.clone();
            tauri::async_runtime::block_on(async move {
                let db_pool = adapters::db::init_db(&handle_clone).await.expect("failed to init db");
                let state = AppState::new(db_pool.clone()).await;
                let event_bus = state.event_bus.clone();
                let rule_engine = state.rule_engine.clone();
                handle_clone.manage(state);

                // Start Message Processor
                let processor = services::message_processor::MessageProcessor::new(
                    event_bus,
                    db_pool,
                    handle_clone.clone(),
                    rule_engine
                );
                
                tauri::async_runtime::spawn(async move {
                    processor.start().await;
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::account::create_account,
            commands::account::list_accounts,
            commands::session::start_session,
            commands::message::send_message,
            commands::message::list_messages,
            commands::rule::create_rule,
            commands::rule::list_rules,
            commands::rule::delete_rule,
            commands::rule::toggle_rule
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
