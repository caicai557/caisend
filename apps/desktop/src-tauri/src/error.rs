use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Serialize, Deserialize, Clone)]
pub enum CoreError {
    #[error("Database error: {0}")]
    DbError(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Domain error: {0}")]
    DomainError(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),

    #[error("An unexpected error occurred: {0}")]
    InternalError(String),

    #[error("Validation failed: {0}")]
    ValidationError(String),

    #[error("System error: {0}")]
    SystemError(String),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    message: String,
}

impl From<CoreError> for String {
    fn from(err: CoreError) -> Self {
        err.to_string()
    }
}

impl From<CoreError> for ErrorResponse {
    fn from(err: CoreError) -> Self {
        ErrorResponse {
            message: err.to_string(),
        }
    }
}

impl From<sqlx::Error> for CoreError {
    fn from(err: sqlx::Error) -> Self {
        CoreError::DbError(err.to_string())
    }
}

impl From<std::io::Error> for CoreError {
    fn from(err: std::io::Error) -> Self {
        CoreError::IoError(err.to_string())
    }
}

impl From<anyhow::Error> for CoreError {
    fn from(err: anyhow::Error) -> Self {
        CoreError::InternalError(err.to_string())
    }
}

impl From<sqlx::migrate::MigrateError> for CoreError {
    fn from(err: sqlx::migrate::MigrateError) -> Self {
        CoreError::DbError(err.to_string())
    }
}

// Backward compatibility alias
impl CoreError {
    pub fn Db(msg: String) -> Self {
        CoreError::DbError(msg)
    }
}
