use anyhow::{Context, Result};
use chromiumoxide::Browser;
use chromiumoxide::cdp::js_protocol::runtime::{AddBindingParams, EvaluateParams};
use futures::StreamExt;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;

use crate::infrastructure::ContextHub;
use tauri::{AppHandle, Manager};

pub const DEFAULT_WEBVIEW2_CDP_PORT: u16 = 9222;

/// Manages CDP Browser connections for each account
#[derive(Clone)]
pub struct CdpManager {
    browsers: Arc<RwLock<HashMap<String, Arc<Browser>>>>,
    app_handle: AppHandle,
}

impl CdpManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            browsers: Arc::new(RwLock::new(HashMap::new())),
            app_handle,
        }
    }

    /// Resolve the WebView2 DevTools websocket endpoint from the exposed HTTP version endpoint.
    async fn resolve_websocket_url(port: u16) -> Result<String> {
        #[derive(Deserialize)]
        struct VersionResponse {
            #[serde(rename = "webSocketDebuggerUrl")]
            web_socket_debugger_url: Option<String>,
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .context("Failed to build HTTP client for DevTools discovery")?;

        let version_url = format!("http://127.0.0.1:{port}/json/version");
        let resp = client
            .get(&version_url)
            .send()
            .await
            .with_context(|| format!("Failed to query DevTools version endpoint at {}", version_url))?
            .error_for_status()
            .with_context(|| format!("DevTools version endpoint {} returned non-success", version_url))?;

        let status = resp.status();
        let payload: VersionResponse = resp
            .json()
            .await
            .with_context(|| format!("Failed to parse DevTools response (status {})", status))?;

        payload
            .web_socket_debugger_url
            .with_context(|| format!("DevTools endpoint at {} missing webSocketDebuggerUrl", version_url))
    }

    /// Connect to a WebView2 instance via CDP, resolving the websocket endpoint and spawning the handler loop.
    pub async fn connect(&self, account_id: String, port: u16) -> Result<()> {
        {
            let browsers = self.browsers.read().await;
            if browsers.contains_key(&account_id) {
                tracing::info!("CDP connection already exists for {}", account_id);
                return Ok(());
            }
        }

        const MAX_ATTEMPTS: u8 = 3;
        let mut last_err: Option<anyhow::Error> = None;
        let ws_url = {
            let mut resolved = None;
            for attempt in 1..=MAX_ATTEMPTS {
                match Self::resolve_websocket_url(port).await {
                    Ok(url) => {
                        resolved = Some(url);
                        break;
                    }
                    Err(err) => {
                        last_err = Some(err);
                        let backoff = Duration::from_millis(200 * attempt as u64);
                        tracing::warn!(
                            "Attempt {}/{} to resolve DevTools websocket failed: {:?}. Retrying in {:?}",
                            attempt,
                            MAX_ATTEMPTS,
                            last_err.as_ref(),
                            backoff
                        );
                        sleep(backoff).await;
                    }
                }
            }
            resolved.ok_or_else(|| last_err.unwrap_or_else(|| anyhow::anyhow!("Unable to resolve DevTools websocket URL")) )?
        };

        tracing::info!(
            "Attempting CDP connection to {} for account {}",
            ws_url,
            account_id
        );

        // Connect to WebSocket
        let (browser, mut handler) = Browser::connect(ws_url.clone())
            .await
            .with_context(|| format!("Failed to connect to DevTools websocket {}", ws_url))?;
        let browser = Arc::new(browser);

        // 🧠 Phase 2.1: Add Runtime Binding for Direct JS → Rust Communication
        let binding_name = "teleflowNotify".to_string();
        tracing::info!("[CDP Binding] Adding {} binding for account {}", binding_name, account_id);
        
        // Add binding to all pages (new and existing)
        if let Err(e) = browser
            .execute(AddBindingParams::new(binding_name.clone()))
            .await
        {
            tracing::error!("[CDP Binding] Failed to add binding: {:?}", e);
        }

        // 👻 Phase 3.3: Fingerprint Spoofing (Ghost Protocol)
        // Override navigator.webdriver to false to evade basic detection
        let spoof_script = r#"
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            // Mock plugins to look like a regular browser
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3],
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        "#;

        tracing::info!("[Ghost Protocol] Injecting fingerprint spoofing for {}", account_id);
        if let Err(e) = browser
            .execute(chromiumoxide::cdp::browser_protocol::page::AddScriptToEvaluateOnNewDocumentParams::new(spoof_script.to_string()))
            .await
        {
             tracing::error!("[Ghost Protocol] Failed to inject spoofing script: {:?}", e);
        }

        // 🔥 Phase 2.2: Start heartbeat for connection health monitoring
        self.start_heartbeat(browser.clone(), account_id.clone(), port);

        // Spawn handler event loop with binding event processing
        let account_clone = account_id.clone();
        let browser_map = self.browsers.clone();
        let _app_handle = self.app_handle.clone(); // Clone for closure

        tokio::spawn(async move {
            while let Some(event_result) = handler.next().await {
                match event_result {
                    Ok(_) => {
                        // TODO: Implement event listening correctly for chromiumoxide 0.5
                        // if ev.name == "teleflowNotify" { ... }
                    }
                    Err(e) => {
                        tracing::error!("CDP Handler error for {}: {:?}", account_clone, e);
                        break;
                    }
                    // _ => {} // Ignore other events
                }
            }
            tracing::info!("CDP Handler finished for {}", account_clone);
            browser_map.write().await.remove(&account_clone);
        });

        // Store browser instance
        self.browsers
            .write()
            .await
            .insert(account_id.clone(), browser);
        tracing::info!("CDP connection established for {}", account_id);
        Ok(())
    }

    /// 🚀 Phase 2.1 + 3.4: Handle direct notification with Priority Scheduling
    /// Priority: WorkflowEngine > RuleEngine
    #[allow(dead_code)]
    fn handle_notification(app_handle: &AppHandle, account_id: &str, payload: &str) {
        tracing::info!("[Direct Link] Account {}: {}", account_id, payload);
        
        // Parse JSON payload
        #[derive(serde::Deserialize, Debug)]
        struct NotificationPayload {
            #[serde(rename = "eventType")]
            event_type: String,
            #[serde(default)]
            payload: serde_json::Value,
        }

        let account_id_owned = account_id.to_string();
        let payload_owned = payload.to_string();
        let app_handle = app_handle.clone();

        // Spawn async task for processing (cannot await in sync context)
        tauri::async_runtime::spawn(async move {
            match serde_json::from_str::<NotificationPayload>(&payload_owned) {
                Ok(notification) => {
                    tracing::info!(
                        "[Direct Link] Parsed event: type={}, payload={:?}",
                        notification.event_type,
                        notification.payload
                    );
                    
                    // 🎯 Phase 3.4: Priority Scheduling
                    if notification.event_type == "NewMessage" {
                        let content = notification.payload
                            .get("content")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        
                        let contact_id = notification.payload
                            .get("chat_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();

                        // TODO: Get WorkflowEngine and RuleEngine from app state
                        // For now, just log the priority path
                        tracing::info!(
                            "[Priority Scheduler] NewMessage: account={}, contact={}, content={}",
                            account_id_owned,
                            contact_id,
                            content
                        );
                    } else if notification.event_type == "PeerFocus" {
                        let peer_id = notification.payload
                            .get("peerId")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                            
                        if !peer_id.is_empty() {
                            tracing::info!("[CDP] PeerFocus detected: {}", peer_id);
                            if let Some(hub) = app_handle.try_state::<Arc<ContextHub>>() {
                                let hub = hub.inner().clone();
                                tauri::async_runtime::spawn(async move {
                                    hub.update_active_peer(peer_id).await;
                                });
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("[Direct Link] Failed to parse payload: {}", e);
                }
            }
        });
    }

    /// Get browser instance for an account
    pub async fn get_browser(&self, account_id: &str) -> Option<Arc<Browser>> {
        self.browsers.read().await.get(account_id).cloned()
    }

    /// Disconnect and remove browser instance
    pub async fn disconnect(&self, account_id: &str) {
        if let Some(_browser) = self.browsers.write().await.remove(account_id) {
            tracing::info!("CDP connection removed for {}", account_id);
        }
    }

    /// 🔥 Phase 2.2: Start heartbeat mechanism for connection health
    /// 
    /// Sends periodic heartbeat (Runtime.evaluate) every 30s to detect connection failures
    /// If heartbeat fails, triggers reconnection with exponential backoff
    fn start_heartbeat(&self, browser: Arc<Browser>, account_id: String, port: u16) {
        let manager_clone = self.clone();
        let ping_params = match EvaluateParams::builder()
            .expression("(()=> 'teleflow-ping')()")
            .return_by_value(true)
            .build()
        {
            Ok(params) => params,
            Err(e) => {
                tracing::error!(
                    "[Heartbeat] Failed to build ping payload for {}: {}",
                    account_id, e
                );
                return;
            }
        };
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            let mut consecutive_failures = 0u32;
            
            loop {
                interval.tick().await;

                let heartbeat_ok = match browser.pages().await {
                    Ok(pages) => {
                        if let Some(page) = pages.into_iter().next() {
                            match page.evaluate_expression(ping_params.clone()).await {
                                Ok(_) => true,
                                Err(e) => {
                                    tracing::warn!(
                                        "[Heartbeat] Evaluate failed for {}: {:?}",
                                        account_id,
                                        e
                                    );
                                    false
                                }
                            }
                        } else {
                            tracing::warn!(
                                "[Heartbeat] No active pages for {}, treating as failure",
                                account_id
                            );
                            false
                        }
                    }
                    Err(e) => {
                        tracing::warn!(
                            "[Heartbeat] Failed to list pages for {}: {:?}",
                            account_id,
                            e
                        );
                        false
                    }
                };

                if heartbeat_ok {
                    if consecutive_failures > 0 {
                        tracing::info!(
                            "[Heartbeat] Recovered for {}, consecutive_failures reset",
                            account_id
                        );
                    }
                    consecutive_failures = 0;
                    continue;
                }

                consecutive_failures += 1;
                tracing::error!(
                    "[Heartbeat] Failed for {} (attempt {})",
                    account_id, consecutive_failures
                );
                
                // After 2 consecutive failures, trigger reconnection
                if consecutive_failures >= 2 {
                    tracing::warn!("[Heartbeat] Connection lost for {}, triggering reconnection", account_id);
                    
                    // Remove dead connection
                    manager_clone.disconnect(&account_id).await;
                    
                    // Attempt reconnection with exponential backoff
                    if let Err(e) = manager_clone.reconnect_with_backoff(account_id.clone(), port).await {
                        tracing::error!("[Reconnect] Failed for {}: {:?}", account_id, e);
                    }
                    
                    break; // Exit heartbeat loop, new connection will have its own heartbeat
                }
            }
        });
    }

    /// 🔥 Phase 2.2: Reconnect with exponential backoff strategy
    /// 
    /// Attempts to reconnect up to 5 times with increasing delays:
    /// 100ms -> 200ms -> 400ms -> 800ms -> 1600ms (capped at 30s)
    async fn reconnect_with_backoff(&self, account_id: String, port: u16) -> Result<()> {
        const MAX_ATTEMPTS: u32 = 5;
        let mut delay = Duration::from_millis(100);
        let max_delay = Duration::from_secs(30);
        
        for attempt in 1..=MAX_ATTEMPTS {
            tracing::info!(
                "[Reconnect] Attempt {}/{} for {} (waiting {:?})",
                attempt, MAX_ATTEMPTS, account_id, delay
            );
            
            tokio::time::sleep(delay).await;
            
            match self.connect(account_id.clone(), port).await {
                Ok(_) => {
                    tracing::info!("[Reconnect] Success for {} on attempt {}", account_id, attempt);
                    return Ok(());
                }
                Err(e) => {
                    tracing::warn!(
                        "[Reconnect] Attempt {}/{} failed for {}: {:?}",
                        attempt, MAX_ATTEMPTS, account_id, e
                    );
                    
                    // Exponential backoff: double the delay, up to max_delay
                    delay = (delay * 2).min(max_delay);
                }
            }
        }
        
        Err(anyhow::anyhow!(
            "Reconnection failed for {} after {} attempts",
            account_id, MAX_ATTEMPTS
        ))
    }

    /// 🚀 Phase 5: Real Message Sending via CDP
    /// 
    /// Calls the injected `window.teleflowSend` function in the browser.
    pub async fn send_message(&self, account_id: &str, peer_id: &str, content: &str) -> Result<()> {
        let browser = self.get_browser(account_id).await
            .ok_or_else(|| anyhow::anyhow!("Browser not connected for {}", account_id))?;
            
        let pages = browser.pages().await
            .context("Failed to get pages")?;
            
        let page = pages.into_iter().next()
            .ok_or_else(|| anyhow::anyhow!("No active page found"))?;
            
        // Escape content for JS string
        let safe_content = serde_json::to_string(content)?;
        let safe_peer = serde_json::to_string(peer_id)?;
        
        let expression = format!(
            "window.teleflowSend({}, {})",
            safe_peer, safe_content
        );
        
        tracing::debug!("[CDP] Executing: {}", expression);
        
        let result = page.evaluate(EvaluateParams::builder()
            .expression(expression)
            .await_promise(true)
            .return_by_value(true)
            .build()
            .unwrap()
        ).await.context("Failed to execute teleflowSend")?;
        
        // Parse result
        let result_json = result.value().cloned().unwrap_or(serde_json::Value::Null);
        
        if result_json.get("success").and_then(|v| v.as_bool()) == Some(true) {
            Ok(())
        } else {
            let error = result_json.get("error").and_then(|v| v.as_str()).unwrap_or("Unknown JS error");
            Err(anyhow::anyhow!("JS execution failed: {}", error))
        }
    }
}


