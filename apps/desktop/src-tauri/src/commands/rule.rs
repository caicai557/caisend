use tauri::State;
use crate::state::AppState;
use crate::domain::rule::Rule;

#[tauri::command]
pub async fn create_rule(
    name: String,
    trigger_type: String,
    conditions: String,
    actions: String,
    state: State<'_, AppState>
) -> Result<Rule, String> {
    let rule = serde_json::from_str::<Rule>(&format!(
        r#"{{"id":"","name":"{}","enabled":true,"trigger_type":"{}","conditions":{},"actions":{}}}"#,
        name, trigger_type, conditions, actions
    )).map_err(|e| e.to_string())?;

    let conditions_json = serde_json::to_string(&rule.conditions).map_err(|e| e.to_string())?;
    let actions_json = serde_json::to_string(&rule.actions).map_err(|e| e.to_string())?;
    let created_at = chrono::Utc::now().timestamp();
    let enabled = if rule.enabled { 1i64 } else { 0i64 };

    sqlx::query!(
        r#"
        INSERT INTO rules (id, name, enabled, trigger_type, conditions, actions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        rule.id,
        rule.name,
        enabled,
        trigger_type,
        conditions_json,
        actions_json,
        created_at
    )
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rule)
}

#[tauri::command]
pub async fn list_rules(state: State<'_, AppState>) -> Result<Vec<Rule>, String> {
    let rows = sqlx::query!(
        r#"
        SELECT id, name, enabled, trigger_type, conditions, actions, created_at
        FROM rules
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    let rules = rows
        .into_iter()
        .filter_map(|row| {
            let conditions: Vec<_> = serde_json::from_str(&row.conditions).ok()?;
            let actions: Vec<_> = serde_json::from_str(&row.actions).ok()?;
            let trigger_type = serde_json::from_str(&format!(r#""{}""#, row.trigger_type)).ok()?;

            Some(Rule {
                id: row.id?,
                name: row.name,
                enabled: row.enabled,
                trigger_type,
                conditions,
                actions,
            })
        })
        .collect();

    Ok(rules)
}

#[tauri::command]
pub async fn delete_rule(id: String, state: State<'_, AppState>) -> Result<(), String> {
    sqlx::query!(
        r#"
        DELETE FROM rules WHERE id = ?
        "#,
        id
    )
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_rule(id: String, enabled: bool, state: State<'_, AppState>) -> Result<(), String> {
    let enabled_val = if enabled { 1i64 } else { 0i64 };
    sqlx::query!(
        r#"
        UPDATE rules SET enabled = ? WHERE id = ?
        "#,
        enabled_val,
        id
    )
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
