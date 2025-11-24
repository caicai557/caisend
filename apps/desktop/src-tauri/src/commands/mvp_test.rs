use tauri::State;
use crate::state::AppState;
use crate::domain::models::{Account, Rule};
use crate::adapters::db::mvp_repo::MvpRepository;
use crate::error::CoreError;
use uuid::Uuid;

/// 创建测试账号
#[tauri::command]
pub async fn create_test_account(
    state: State<'_, AppState>,
    name: String,
) -> Result<Account, CoreError> {
    let repo = MvpRepository::new(state.db_pool.clone());
    let account = Account {
        id: Uuid::new_v4().to_string(),
        name,
        status: "Active".to_string(),
    };
    repo.create_account(&account).await?;
    Ok(account)
}

/// 创建测试规则
#[tauri::command]
pub async fn create_test_rule(
    state: State<'_, AppState>,
    account_id: String,
    trigger_pattern: String,
    reply_text: String,
) -> Result<Rule, CoreError> {
    let repo = MvpRepository::new(state.db_pool.clone());
    let rule = Rule {
        id: Uuid::new_v4().to_string(),
        account_id: Some(account_id.clone()),
        trigger_type: "Keyword".to_string(),
        trigger_pattern,
        reply_text: Some(reply_text),
        delay_min_ms: 1000,
        delay_max_ms: 3000,
        is_enabled: true,
    };
    repo.create_rule(&rule).await?;
    
    // 更新缓存
    let mut cache = state.rule_cache.write().await;
    let rules = cache.entry(account_id).or_insert_with(Vec::new);
    rules.push(rule.clone());
    
    Ok(rule)
}

/// 测试自动化逻辑
#[tauri::command]
pub async fn test_automation(
    state: State<'_, AppState>,
    account_id: String,
    test_message: String,
) -> Result<String, CoreError> {
    use crate::domain::automation::SimpleRuleEngine;
    use std::sync::Arc;
    
    let engine = SimpleRuleEngine::new(Arc::new(AppState {
        db_pool: state.db_pool.clone(),
        connection_manager: state.connection_manager.clone(),
        event_bus: state.event_bus.clone(),
        rule_cache: state.rule_cache.clone(),
    }));
    
    if let Some(rule) = engine.evaluate_message(&test_message, &account_id).await {
        Ok(format!("匹配规则: {} -> 回复: {:?}", rule.trigger_pattern, rule.reply_text))
    } else {
        Ok("未匹配任何规则".to_string())
    }
}
