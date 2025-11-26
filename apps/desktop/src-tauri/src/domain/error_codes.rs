/// 统一错误码定义
/// 
/// 用于前后端错误消息的标准化传递

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserFriendlyError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum ErrorCode {
    // 数据库错误 (1xxx)
    DatabaseConnection = 1001,
    DatabaseQuery = 1002,
    DatabaseNotFound = 1003,
    
    // 业务逻辑错误 (2xxx)
    InvalidAccountId = 2001,
    InvalidPeerId = 2002,
    FlowNotFound = 2003,
    InstanceNotFound = 2004,
    StepNotFound = 2005,
    
    // 配置错误 (3xxx)
    ConfigNotFound = 3001,
    ConfigInvalid = 3002,
    
    // 系统错误 (4xxx)
    InternalError = 4001,
    SerializationError = 4002,
    
    // 权限错误 (5xxx)
    Unauthorized = 5001,
    Forbidden = 5002,
}

impl UserFriendlyError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }
    
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }
    
    /// 从CoreError转换为用户友好错误
    pub fn from_core_error(err: crate::error::CoreError) -> Self {
        match err {
            crate::error::CoreError::DbError(msg) => {
                Self::new(ErrorCode::DatabaseQuery, "数据库操作失败")
                    .with_details(msg)
            }
            crate::error::CoreError::IoError(msg) => {
                Self::new(ErrorCode::InternalError, "文件操作失败")
                    .with_details(msg)
            }
            crate::error::CoreError::InternalError(msg) => {
                Self::new(ErrorCode::InternalError, "内部错误")
                    .with_details(msg)
            }
            _ => Self::new(ErrorCode::InternalError, "未知错误"),
        }
    }
}

impl std::fmt::Display for UserFriendlyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code as u32, self.message)?;
        if let Some(details) = &self.details {
            write!(f, " ({})", details)?;
        }
        Ok(())
    }
}

impl From<crate::error::CoreError> for UserFriendlyError {
    fn from(err: crate::error::CoreError) -> Self {
        Self::from_core_error(err)
    }
}
