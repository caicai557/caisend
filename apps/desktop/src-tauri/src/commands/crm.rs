use crate::error::CoreError;
use crate::state::AppState;
use crate::domain::models::Contact;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn update_contact(
    state: State<'_, AppState>,
    account_id: String,
    remote_id: String,
    name: Option<String>,
    tags: Option<Vec<String>>,
    notes: Option<String>,
) -> Result<Contact, CoreError> {
    let tags_json = tags.map(|t| serde_json::to_string(&t).unwrap_or_default());
    
    // Upsert logic
    // We use a simplified approach: try insert, on conflict update
    // Note: SQLite ON CONFLICT requires a unique constraint which we added in migration
    
    let id = Uuid::new_v4().to_string();
    
    let contact = sqlx::query_as::<_, Contact>(
        r#"
        INSERT INTO contacts (id, account_id, remote_id, name, tags, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(account_id, remote_id) DO UPDATE SET
            name = coalesce(excluded.name, contacts.name),
            tags = coalesce(excluded.tags, contacts.tags),
            notes = coalesce(excluded.notes, contacts.notes),
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
        "#
    )
    .bind(id)
    .bind(account_id)
    .bind(remote_id)
    .bind(name)
    .bind(tags_json)
    .bind(notes)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| CoreError::DbError(e.to_string()))?;

    Ok(contact)
}

#[tauri::command]
pub async fn get_contact(
    state: State<'_, AppState>,
    account_id: String,
    remote_id: String,
) -> Result<Option<Contact>, CoreError> {
    let contact = sqlx::query_as::<_, Contact>(
        "SELECT * FROM contacts WHERE account_id = ? AND remote_id = ?"
    )
    .bind(account_id)
    .bind(remote_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| CoreError::DbError(e.to_string()))?;

    Ok(contact)
}
