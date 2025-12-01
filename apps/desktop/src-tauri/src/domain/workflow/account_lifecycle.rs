use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

/// 账号生命周期状态
/// 
/// 表示账号在系统中的当前阶段，驱动 PFSM 的宏观决策
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum AccountLifecycleState {
    /// 未登录（初始状态）
    /// 
    /// 系统应触发登录 PBT
    Idle,
    
    /// 登录中（执行登录 PBT）
    /// 
    /// 等待登录 PBT 完成
    LoggingIn,
    
    /// 已登录，活跃中
    /// 
    /// 可以执行正常的工作流任务（发消息、收件等）
    Active,
    
    /// 受限状态（被ban/限流）
    /// 
    /// 应触发冷却策略 PBT
    Restricted {
        reason: String,
        until: Option<DateTime<Utc>>,
    },
    
    /// 离线
    /// 
    /// 等待重新连接或重启
    Offline,
}

impl Default for AccountLifecycleState {
    fn default() -> Self {
        Self::Idle
    }
}

impl AccountLifecycleState {
    /// 检查是否可以执行正常任务
    pub fn is_operational(&self) -> bool {
        matches!(self, Self::Active)
    }
    
    /// 检查是否需要登录
    pub fn needs_login(&self) -> bool {
        matches!(self, Self::Idle | Self::Offline)
    }
    
    /// 检查是否处于受限状态
    pub fn is_restricted(&self) -> bool {
        matches!(self, Self::Restricted { .. })
    }
    
    /// 状态转换：登录开始
    pub fn transition_to_logging_in(&mut self) {
        if self.needs_login() {
            *self = Self::LoggingIn;
        }
    }
    
    /// 状态转换：登录成功
    pub fn transition_to_active(&mut self) {
        if matches!(self, Self::LoggingIn) {
            *self = Self::Active;
        }
    }
    
    /// 状态转换：检测到受限
    pub fn transition_to_restricted(&mut self, reason: String, until: Option<DateTime<Utc>>) {
        *self = Self::Restricted { reason, until };
    }
    
    /// 状态转换：离线
    pub fn transition_to_offline(&mut self) {
        *self = Self::Offline;
    }
    
    /// 序列化为字符串（用于数据库存储）
    pub fn to_db_string(&self) -> String {
        match self {
            Self::Idle => "Idle".to_string(),
            Self::LoggingIn => "LoggingIn".to_string(),
            Self::Active => "Active".to_string(),
            Self::Restricted { reason, until } => {
                let until_str = until.map(|dt| dt.to_rfc3339()).unwrap_or_default();
                format!("Restricted:{}:{}", reason, until_str)
            }
            Self::Offline => "Offline".to_string(),
        }
    }
    
    /// 从数据库字符串反序列化
    pub fn from_db_string(s: &str) -> Result<Self, String> {
        let parts: Vec<&str> = s.split(':').collect();
        
        match parts[0] {
            "Idle" => Ok(Self::Idle),
            "LoggingIn" => Ok(Self::LoggingIn),
            "Active" => Ok(Self::Active),
            "Restricted" => {
                let reason = parts.get(1).unwrap_or(&"Unknown").to_string();
                let until = parts.get(2)
                    .filter(|s| !s.is_empty())
                    .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.with_timezone(&Utc));
                Ok(Self::Restricted { reason, until })
            }
            "Offline" => Ok(Self::Offline),
            _ => Err(format!("Unknown lifecycle state: {}", s)),
        }
    }
}

/// 账号上下文（扩展信息）
/// 
/// 存储账号的元数据，可在 Workflow 和 PBT 之间共享
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountContext {
    pub account_id: String,
    pub lifecycle_state: AccountLifecycleState,
    
    /// 当前活跃的 PBT 实例 ID（如果有）
    pub active_pbt_instance: Option<String>,
    
    /// 账号元数据（灵活的 JSON）
    /// 
    /// 可存储：登录凭证、代理配置、限流计数等
    pub metadata: serde_json::Value,
    
    pub updated_at: DateTime<Utc>,
}

impl AccountContext {
    pub fn new(account_id: String) -> Self {
        Self {
            account_id,
            lifecycle_state: AccountLifecycleState::default(),
            active_pbt_instance: None,
            metadata: serde_json::json!({}),
            updated_at: Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lifecycle_state_transitions() {
        let mut state = AccountLifecycleState::Idle;
        
        assert!(state.needs_login());
        assert!(!state.is_operational());
        
        state.transition_to_logging_in();
        assert_eq!(state, AccountLifecycleState::LoggingIn);
        
        state.transition_to_active();
        assert_eq!(state, AccountLifecycleState::Active);
        assert!(state.is_operational());
    }
    
    #[test]
    fn test_db_string_serialization() {
        let state = AccountLifecycleState::Active;
        let db_str = state.to_db_string();
        assert_eq!(db_str, "Active");
        
        let restored = AccountLifecycleState::from_db_string(&db_str).unwrap();
        assert_eq!(restored, state);
    }
    
    #[test]
    fn test_restricted_state_serialization() {
        let until = Utc::now();
        let state = AccountLifecycleState::Restricted {
            reason: "rate_limited".to_string(),
            until: Some(until),
        };
        
        let db_str = state.to_db_string();
        let restored = AccountLifecycleState::from_db_string(&db_str).unwrap();
        
        if let AccountLifecycleState::Restricted { reason, .. } = restored {
            assert_eq!(reason, "rate_limited");
        } else {
            panic!("Expected Restricted state");
        }
    }
}
