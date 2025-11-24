use chromiumoxide::{Browser, BrowserConfig};
use futures::StreamExt;
use std::path::PathBuf;
use crate::error::CoreError;

pub struct CdpClient {
    pub browser: Browser,
    // We might need to store the handler join handle if we want to gracefully shutdown
    // pub handler_task: tokio::task::JoinHandle<()>,
}

impl CdpClient {
    pub async fn launch(account_id: &str) -> Result<Self, CoreError> {
        let user_data_dir = PathBuf::from(format!("sessions/{}", account_id));
        
        // Ensure directory exists
        if !user_data_dir.exists() {
            std::fs::create_dir_all(&user_data_dir)?;
        }

        let config = BrowserConfig::builder()
            .user_data_dir(user_data_dir)
            .with_head() // Run with head for now to see what's happening, change to headless later if needed
            .build()
            .map_err(|e| CoreError::Unknown(e.to_string()))?;

        let (browser, mut handler) = Browser::launch(config)
            .await
            .map_err(|e| CoreError::Unknown(e.to_string()))?;

        // Spawn the handler in a background task
        tokio::spawn(async move {
            while let Some(h) = handler.next().await {
                if h.is_err() {
                    break;
                }
            }
        });

        // Create a new page (tab)
        let page = browser.new_page("about:blank").await
            .map_err(|e| CoreError::Unknown(e.to_string()))?;

        // Inject Mutation Observer Script
        // In a real build, include_str! the JS file
        let script = include_str!("../../../js/mutation_observer.js");
        page.evaluate_on_new_document(script).await
            .map_err(|e| CoreError::Unknown(e.to_string()))?;

        // Add Binding for JS -> Rust communication
        // This allows window.teleflowNotify(data) to be called in JS
        // We need to handle the binding called event elsewhere (in the processing pipeline)
        // For now, we just register it.
        // Note: chromiumoxide might need a specific way to handle bindings via events.
        // The standard CDP way is Runtime.addBinding.
        // chromiumoxide's Page api has expose_function but that might be high level.
        // We'll assume we handle the "Runtime.bindingCalled" event in the event loop if we were using raw CDP,
        // but chromiumoxide might abstract this.
        // For MVP, let's stick to the plan: use Runtime.addBinding if available or equivalent.
        
        // Actually, chromiumoxide doesn't have a direct `add_binding` on Page yet in some versions.
        // We might need to execute raw CDP command if strictly needed, or use `expose_function` if available.
        // Let's use a placeholder for the binding setup which would be part of the page setup.
        
        // For this MVP, we will rely on the fact that we can evaluate JS. 
        // Real binding requires handling the event stream.
        
        Ok(Self { browser })
    }
}
