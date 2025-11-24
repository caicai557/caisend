use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Pool, Sqlite, SqlitePool};
use std::str::FromStr;
use crate::error::CoreError;

pub mod mvp_repo;

pub async fn init_db(database_url: &str) -> Result<SqlitePool, CoreError> {
    let mut options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal); // Enable WAL for concurrency

    options = options.log_statements(log::LevelFilter::Debug);

    let pool = SqlitePool::connect_with(options).await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
