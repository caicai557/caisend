use crate::actuator::service::{execute_click, execute_typing};
use crate::domain::models::{AutomationRule, TriggerType};
use crate::managers::cdp_manager::CdpManager;
use crate::state::AppState;
use rand::Rng;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

/// Rule Engine for evaluating triggers and executing automation
pub struct RuleEngine {
    app_handle: AppHandle,
}

impl RuleEngine {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    fn state(&self) -> tauri::State<'_, AppState> {
        self.app_handle.state::<AppState>()
    }

    fn cdp_manager(&self) -> tauri::State<'_, CdpManager> {
        self.app_handle.state::<CdpManager>()
    }

    /// Evaluate message content against rules and trigger automation
    pub async fn evaluate_message(
        &self,
        content: &str,
        account_id: &str,
    ) -> Option<AutomationRule> {
        tracing::info!("RuleEngine: Evaluating message for account: {}", account_id);
        let rules = self.state().rules_for_account(account_id).await;

        if rules.is_empty() {
            tracing::warn!("RuleEngine: No rules found for account {}", account_id);
            return None;
        }

        tracing::debug!("RuleEngine: Found {} rules for account", rules.len());
        for rule in rules {
            if !rule.is_enabled {
                tracing::debug!("RuleEngine: Rule {} is disabled", rule.id);
                continue;
            }

            let pattern = rule.trigger_pattern.clone().unwrap_or_default();
            tracing::debug!(
                "RuleEngine: Checking rule {} (Type: {:?}, Pattern: '{}')",
                rule.id,
                rule.trigger_type,
                pattern
            );

            let matched = match rule.trigger_type {
                TriggerType::Keyword => content.contains(&pattern),
                TriggerType::Regex => {
                    if let Ok(re) = regex::Regex::new(&pattern) {
                        re.is_match(content)
                    } else {
                        false
                    }
                }
                _ => false,
            };

            if matched {
                tracing::info!("RuleEngine: MATCH FOUND for rule {}", rule.id);
                let cdp_manager = self.cdp_manager().inner().clone();
                let account = account_id.to_string();
                let rule_clone = rule.clone();
                
                tokio::spawn(async move {
                    if let Err(err) = execute_reply_sequence(rule_clone, account, cdp_manager).await {
                        tracing::error!("RuleEngine: Failed to execute automation: {}", err);
                    }
                });
                return Some(rule);
            }
        }

        tracing::debug!("RuleEngine: No match found");
        None
    }
}

/// Execute automation sequence using CDP
async fn execute_reply_sequence(
    rule: AutomationRule,
    account_id: String,
    cdp_manager: std::sync::Arc<CdpManager>,
) -> Result<(), String> {
    if rule.reply_text.is_none() {
        return Ok(());
    }

    // Calculate delay
    let delay_ms = if rule.delay_max_ms > rule.delay_min_ms {
        rand::thread_rng().gen_range(rule.delay_min_ms..=rule.delay_max_ms)
    } else {
        rule.delay_min_ms
    };

    tracing::info!("Delaying automation by {}ms", delay_ms);
    sleep(Duration::from_millis(delay_ms as u64)).await;

    // Get browser instance
    let browser = cdp_manager
        .get_browser(&account_id)
        .await
        .ok_or_else(|| format!("No CDP connection for account {}", account_id))?;

    // Use robust selectors (ARIA attributes preferred)
    let input_selector = "div[contenteditable='true'][role='textbox']";
    let send_button_selector = "button[aria-label='Send']";

    // Type text into input
    if let Some(text) = rule.reply_text.clone() {
        tracing::info!("Typing text: {}", text);
        execute_typing(&browser, input_selector, &text)
            .await
            .map_err(|e| format!("CDP typing failed: {}", e))?;
        
        sleep(Duration::from_millis(200)).await;
    }

    // Click send button
    tracing::info!("Clicking send button");
    execute_click(&browser, send_button_selector)
        .await
        .map_err(|e| format!("CDP click failed: {}", e))?;

    tracing::info!("Automation sequence completed successfully");
    Ok(())
}

