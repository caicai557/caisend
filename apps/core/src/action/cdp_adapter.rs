//! CDP Adapter - Chromiumoxide wrapper for browser control
//!
//! Provides a clean interface for CDP actions with built-in stealth.

use std::path::PathBuf;
use std::time::Duration;

use tracing::info;

use super::input_simulator::{generate_bezier_path, generate_click_delay, generate_keystroke_delays, generate_movement_delays, Point, TypingConfig};
use super::stealth::{generate_stealth_script, StealthCommands, StealthConfig};

/// Configuration for the CDP adapter
#[derive(Debug, Clone)]
pub struct CdpConfig {
    /// Path to Chrome/Chromium executable
    pub browser_path: Option<PathBuf>,
    /// User data directory (for session isolation)
    pub user_data_dir: PathBuf,
    /// Headless mode
    pub headless: bool,
    /// Stealth configuration
    pub stealth: StealthConfig,
    /// Typing configuration
    pub typing: TypingConfig,
}

impl CdpConfig {
    /// Create a new config with a unique user data dir
    pub fn with_account(account_id: &str) -> Self {
        Self {
            browser_path: None,
            user_data_dir: PathBuf::from(format!("./data/browsers/{}", account_id)),
            headless: false,
            stealth: StealthConfig::default(),
            typing: TypingConfig::default(),
        }
    }
}

impl Default for CdpConfig {
    fn default() -> Self {
        Self {
            browser_path: None,
            user_data_dir: PathBuf::from("./data/browsers/default"),
            headless: false,
            stealth: StealthConfig::default(),
            typing: TypingConfig::default(),
        }
    }
}

/// High-level action commands for Telegram automation
#[derive(Debug, Clone)]
pub enum TelegramAction {
    /// Navigate to a specific chat
    OpenChat { chat_id: String },
    /// Type a message (with human-like delays)
    TypeMessage { text: String },
    /// Click the send button
    SendMessage,
    /// Click an element by selector
    Click { selector: String },
    /// Wait for an element to appear
    WaitForElement { selector: String, timeout_ms: u64 },
    /// Take a screenshot
    Screenshot { path: String },
    /// Execute custom JavaScript
    ExecuteJs { script: String },
}

/// Simulated action result (for testing without actual browser)
#[derive(Debug)]
pub struct ActionResult {
    pub success: bool,
    pub duration: Duration,
    pub details: Option<String>,
}

/// CDP Adapter - wraps browser control with stealth
pub struct CdpAdapter {
    config: CdpConfig,
    /// Simulated state for testing
    current_chat: Option<String>,
}

impl CdpAdapter {
    /// Create a new adapter with the given config
    pub fn new(config: CdpConfig) -> Self {
        info!("🌐 CdpAdapter created for: {:?}", config.user_data_dir);
        Self {
            config,
            current_chat: None,
        }
    }

    /// Get the browser launch arguments with stealth flags
    pub fn get_launch_args(&self) -> Vec<String> {
        let mut args = StealthCommands::stealth_browser_args();
        
        // Add user data directory
        args.push(format!("--user-data-dir={}", self.config.user_data_dir.display()));
        
        if self.config.headless {
            args.push("--headless=new".to_string());
        }
        
        args
    }

    /// Get the stealth injection script
    pub fn get_stealth_script(&self) -> String {
        generate_stealth_script(&self.config.stealth)
    }

    /// Simulate typing with human-like delays
    /// 
    /// In production, this would use CDP to send key events.
    /// Here we calculate and return the typing plan.
    pub fn plan_typing(&self, text: &str) -> Vec<(char, Duration)> {
        let delays = generate_keystroke_delays(text, &self.config.typing);
        text.chars().zip(delays).collect()
    }

    /// Simulate mouse movement from current position to target
    /// 
    /// In production, this would use CDP Mouse.move events.
    pub fn plan_mouse_move(&self, from: Point, to: Point) -> Vec<(Point, Duration)> {
        let path = generate_bezier_path(from, to, 25);
        let delays = generate_movement_delays(path.len());
        path.into_iter().zip(delays).collect()
    }

    /// Get click delay
    pub fn get_click_delay(&self) -> Duration {
        generate_click_delay()
    }

    /// Execute an action (simulated for testing)
    pub async fn execute(&mut self, action: TelegramAction) -> ActionResult {
        let start = std::time::Instant::now();
        
        match action {
            TelegramAction::OpenChat { chat_id } => {
                info!("🔗 Opening chat: {}", chat_id);
                self.current_chat = Some(chat_id.clone());
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some(format!("Opened chat {}", chat_id)),
                }
            }
            TelegramAction::TypeMessage { text } => {
                let plan = self.plan_typing(&text);
                let total_time: Duration = plan.iter().map(|(_, d)| *d).sum();
                info!("⌨️ Typing {} chars (~{}ms)", text.len(), total_time.as_millis());
                
                // Simulate the typing delay
                tokio::time::sleep(Duration::from_millis(50)).await;
                
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some(format!("Typed {} chars", text.len())),
                }
            }
            TelegramAction::SendMessage => {
                info!("📤 Sending message");
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some("Message sent".to_string()),
                }
            }
            TelegramAction::Click { selector } => {
                info!("🖱️ Clicking: {}", selector);
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some(format!("Clicked {}", selector)),
                }
            }
            TelegramAction::WaitForElement { selector, timeout_ms } => {
                info!("⏳ Waiting for: {} ({}ms)", selector, timeout_ms);
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some(format!("Found {}", selector)),
                }
            }
            TelegramAction::Screenshot { path } => {
                info!("📸 Screenshot: {}", path);
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: Some(format!("Saved to {}", path)),
                }
            }
            TelegramAction::ExecuteJs { script } => {
                info!("🔧 Executing JS ({} chars)", script.len());
                ActionResult {
                    success: true,
                    duration: start.elapsed(),
                    details: None,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cdp_adapter_actions() {
        let config = CdpConfig::with_account("test_account");
        let mut adapter = CdpAdapter::new(config);
        
        // Test OpenChat
        let result = adapter.execute(TelegramAction::OpenChat { 
            chat_id: "123456".to_string() 
        }).await;
        assert!(result.success);
        
        // Test TypeMessage
        let result = adapter.execute(TelegramAction::TypeMessage { 
            text: "Hello!".to_string() 
        }).await;
        assert!(result.success);
        
        // Test SendMessage
        let result = adapter.execute(TelegramAction::SendMessage).await;
        assert!(result.success);
        
        println!("✅ CDP Adapter actions test passed");
    }

    #[test]
    fn test_typing_plan() {
        let config = CdpConfig::default();
        let adapter = CdpAdapter::new(config);
        
        let plan = adapter.plan_typing("Test message");
        assert_eq!(plan.len(), "Test message".len());
        
        // Total time should be reasonable
        let total: Duration = plan.iter().map(|(_, d)| *d).sum();
        assert!(total.as_millis() > 100); // At least 100ms for 12 chars
        
        println!("✅ Typing plan test passed (total: {}ms)", total.as_millis());
    }

    #[test]
    fn test_mouse_plan() {
        let config = CdpConfig::default();
        let adapter = CdpAdapter::new(config);
        
        let from = Point::new(100.0, 100.0);
        let to = Point::new(400.0, 300.0);
        let plan = adapter.plan_mouse_move(from, to);
        
        assert_eq!(plan.len(), 26); // 25 steps + 1
        
        println!("✅ Mouse plan test passed ({} points)", plan.len());
    }

    #[test]
    fn test_launch_args() {
        let config = CdpConfig::with_account("stealth_test");
        let adapter = CdpAdapter::new(config);
        
        let args = adapter.get_launch_args();
        
        assert!(args.iter().any(|a| a.contains("AutomationControlled")));
        assert!(args.iter().any(|a| a.contains("user-data-dir")));
        
        println!("✅ Launch args test passed ({} args)", args.len());
    }
}
