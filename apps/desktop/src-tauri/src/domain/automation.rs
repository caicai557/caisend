use crate::actuator::scheduler::{AutomationTask, FocusScheduler};
use crate::domain::models::{AutomationRule, TriggerType};
use crate::state::AppState;
use rand::Rng;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

/// 简化版规则引擎 - 仅实现基本的关键词匹配
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

    fn scheduler(&self) -> FocusScheduler {
        self.state().focus_scheduler().clone()
    }

    /// 评估消息并返回匹配的规则，同时将执行序列提交给 FocusScheduler
    pub async fn evaluate_message(
        &self,
        content: &str,
        account_id: &str,
    ) -> Option<AutomationRule> {
        println!("RuleEngine: Evaluating message for account: {}", account_id);
        let rules = self.state().rules_for_account(account_id).await;

        if rules.is_empty() {
            println!(
                "RuleEngine: No rules found in cache for account {}",
                account_id
            );
            return None;
        }

        println!("RuleEngine: Found {} rules for account", rules.len());
        for rule in rules {
            if !rule.is_enabled {
                println!("RuleEngine: Rule {} is disabled", rule.id);
                continue;
            }

            let pattern = rule.trigger_pattern.clone().unwrap_or_default();
            println!(
                "RuleEngine: Checking rule {} (Type: {:?}, Pattern: '{}') against content '{}'",
                rule.id, rule.trigger_type, pattern, content
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
                println!("RuleEngine: MATCH FOUND!");
                let scheduler = self.scheduler();
                let account = account_id.to_string();
                let rule_clone = rule.clone();
                tokio::spawn(async move {
                    if let Err(err) = execute_reply_sequence(rule_clone, account, scheduler).await {
                        eprintln!("RuleEngine: failed to execute reply sequence: {}", err);
                    }
                });
                return Some(rule);
            }
        }

        println!("RuleEngine: No match found");
        None
    }
}

/// 根据规则将操作序列推送到焦点调度器
async fn execute_reply_sequence(
    rule: AutomationRule,
    account_id: String,
    scheduler: FocusScheduler,
) -> Result<(), String> {
    if rule.reply_text.is_none() {
        return Ok(());
    }

    let delay_ms = if rule.delay_max_ms > rule.delay_min_ms {
        rand::thread_rng().gen_range(rule.delay_min_ms..=rule.delay_max_ms)
    } else {
        rule.delay_min_ms
    };

    sleep(Duration::from_millis(delay_ms as u64)).await;

    let input_selector = "div[contenteditable='true']".to_string();
    let send_button_selector = "button[title='Send']".to_string();

    scheduler
        .submit(AutomationTask::ClickSelector {
            account_id: account_id.clone(),
            selector: input_selector,
        })
        .await
        .map_err(|e| e.to_string())?;

    sleep(Duration::from_millis(200)).await;

    if let Some(text) = rule.reply_text.clone() {
        scheduler
            .submit(AutomationTask::Type {
                account_id: account_id.clone(),
                text,
            })
            .await
            .map_err(|e| e.to_string())?;
    }

    sleep(Duration::from_millis(200)).await;

    scheduler
        .submit(AutomationTask::ClickSelector {
            account_id,
            selector: send_button_selector,
        })
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
