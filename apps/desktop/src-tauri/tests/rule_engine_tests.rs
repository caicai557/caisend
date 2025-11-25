use teleflow_desktop_lib::domain::models::{AutomationRule, TriggerType};
use teleflow_desktop_lib::state::{AppStore, Cold};

#[tokio::test]
async fn automation_rule_roundtrip() {
    let state: AppStore<Cold> = AppStore::new(
        sqlx::SqlitePool::connect_lazy("sqlite::memory:").unwrap()
    );

    let ready = state.into_ready();
    let rule = AutomationRule {
        id: "r1".to_string(),
        account_id: Some("acc1".to_string()),
        trigger_type: TriggerType::Keyword,
        trigger_pattern: Some("hello".to_string()),
        reply_text: Some("hi".to_string()),
        delay_min_ms: 1000,
        delay_max_ms: 1200,
        is_enabled: true,
    };

    // cache add and fetch
    let count = ready.add_rule(rule.clone()).await.unwrap();
    assert_eq!(count, 1);

    let fetched = ready.rules_for_account("acc1").await;
    assert_eq!(fetched.len(), 1);
    assert_eq!(fetched[0].trigger_type, TriggerType::Keyword);
    assert_eq!(fetched[0].trigger_pattern.as_deref(), Some("hello"));
}
