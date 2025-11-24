use crate::adapters::db::mvp_repo::MvpRepository;
use crate::domain::models::{Account, AutomationRule, TriggerType};
use crate::error::CoreError;
use crate::state::AppState;
use tauri::State;
use uuid::Uuid;

/// 创建测试账号
#[tauri::command]
pub async fn create_test_account(
    state: State<'_, AppState>,
    name: String,
) -> Result<Account, CoreError> {
    let repo = MvpRepository::new(state.pool().clone());
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
) -> Result<AutomationRule, CoreError> {
    let repo = MvpRepository::new(state.pool().clone());
    let rule = AutomationRule {
        id: Uuid::new_v4().to_string(),
        account_id: Some(account_id.clone()),
        trigger_type: TriggerType::Keyword,
        trigger_pattern: Some(trigger_pattern.clone()),
        reply_text: Some(reply_text),
        delay_min_ms: 1000,
        delay_max_ms: 3000,
        is_enabled: true,
    };
    repo.create_rule(&rule).await?;

    println!("========================================");
    println!("📝 Creating Rule:");
    println!("   Account ID: '{}'", account_id);
    println!("   Rule ID: {}", rule.id);
    println!("   Pattern: '{}'", trigger_pattern);
    println!("   Trigger Type: {:?}", rule.trigger_type);
    println!("========================================");

    // 更新缓存
    if let Some(rule_count) = state.add_rule(rule.clone()).await {
        println!("✅ Rule added to cache:");
        println!(
            "   Total rules for account '{}': {}",
            account_id, rule_count
        );
        let accounts = state.cached_accounts().await;
        println!("   Total accounts in cache: {}", accounts.len());
    } else {
        println!("⚠️  Rule missing account_id, skipped cache update");
    }

    // 验证缓存写入
    let cached_accounts = state.cached_accounts().await;
    println!("🔍 Cache Verification:");
    println!("   Cache keys: {:?}", cached_accounts);

    let rules = state.rules_for_account(&account_id).await;
    if !rules.is_empty() {
        println!(
            "   ✅ Verification SUCCESS: {} rules found for account '{}'",
            rules.len(),
            account_id
        );
        for (idx, r) in rules.iter().enumerate() {
            println!(
                "      Rule #{}: Pattern='{}'",
                idx + 1,
                r.trigger_pattern.clone().unwrap_or_default()
            );
        }
    } else {
        println!(
            "   ❌ Verification FAILED: No rules found for account '{}'",
            account_id
        );
    }
    println!("========================================");

    Ok(rule)
}

/// 测试自动化逻辑
#[tauri::command]
pub async fn test_automation(
    state: State<'_, AppState>,
    account_id: String,
    test_message: String,
) -> Result<String, CoreError> {
    println!("========================================");
    println!("Command: Testing automation");
    println!("   Account ID: '{}'", account_id);
    println!("   Message: '{}'", test_message);
    println!("========================================");

    // ✅ 直接使用 state，不创建新的 AppState 实例
    let cached_accounts = state.cached_accounts().await;

    println!("📊 Cache Status:");
    println!("   Total accounts in cache: {}", cached_accounts.len());
    println!("   Cache keys:");
    for key in &cached_accounts {
        println!("      - '{}'", key);
    }

    let rules = state.rules_for_account(&account_id).await;
    if rules.is_empty() {
        println!("❌ No rules found in cache for account '{}'", account_id);
        println!("   Available accounts: {:?}", cached_accounts);
        return Ok("未匹配任何规则".to_string());
    }

    println!(
        "✅ Found {} rules for account '{}'",
        rules.len(),
        account_id
    );

    for (idx, rule) in rules.iter().enumerate() {
        println!(
            "   Rule #{}: ID={}, Enabled={}, Type={:?}, Pattern='{}'",
            idx + 1,
            rule.id,
            rule.is_enabled,
            rule.trigger_type,
            rule.trigger_pattern.clone().unwrap_or_default()
        );

        if !rule.is_enabled {
            println!("      ⏭️  Skipping (disabled)");
            continue;
        }

        let pattern = rule.trigger_pattern.clone().unwrap_or_default();
        println!(
            "      🔍 Checking if '{}' contains '{}'",
            test_message, pattern
        );

        if matches!(rule.trigger_type, TriggerType::Keyword) && test_message.contains(&pattern) {
            println!("      ✅ MATCH FOUND!");
            return Ok(format!(
                "匹配规则: {} -> 回复: {:?}",
                pattern, rule.reply_text
            ));
        } else {
            println!("      ❌ No match");
        }
    }

    println!(
        "❌ No matching rule found after checking all {} rules",
        rules.len()
    );
    Ok("未匹配任何规则".to_string())
}
